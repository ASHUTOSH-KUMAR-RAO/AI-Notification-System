import { db } from '../../config/db'
import { Prisma } from '../../generated/prisma/client'
import { unsubscribeUrl } from '../../utils/unsubscribe'
import { localParts, parseHHmm } from '../../utils/time'
import { summarizeGroupWithRules } from '../ai/rules'
import { memberSignature } from '../notification.groups'
import { getPreferences } from '../preferences.service'
import type { DigestGroup } from '../../emails/DigestEmail'
import { defaultDeps, type DeliveryDeps } from './delivery.service'
import { inboxUrl, settingsUrl } from './email.channel'
import { DeliveryError } from './errors'
import { log } from '../../utils/logger'

const MAX_ITEMS = 60
const MAX_DIGEST_ATTEMPTS = 3
const RETRY_AFTER_MS = 5 * 60_000 // multiplied by the attempt number
const CRASH_LEASE_MS = 10 * 60_000 // a claimed run not finished within this is assumed crashed
const DAY_MS = 24 * 60 * 60_000

/**
 * Unread LOW/MEDIUM notifications (HIGH ones were emailed instantly) from un-muted categories since the last
 * digest, grouped, each group with its cached AI summary (or a rule-based line).
 */
export async function collectDigest(userId: string, since: Date) {
  const prefs = await getPreferences(userId)
  const muted = Object.entries(prefs.categories).filter(([, c]) => !c.enabled).map(([k]) => k)

  const items = await db.notification.findMany({
    where: {
      userId,
      isRead: false,
      isSpam: false,
      deletedAt: null,
      priority: { in: ['LOW', 'MEDIUM'] },
      createdAt: { gte: since },
      ...(muted.length > 0 && { category: { notIn: muted as never[] } }),
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: MAX_ITEMS,
    select: { id: true, title: true, category: true, groupKey: true },
  })
  if (items.length === 0) return { total: 0, groups: [] as DigestGroup[] }

  const byGroup = new Map<string, typeof items>()
  for (const i of items) byGroup.set(i.groupKey ?? i.id, [...(byGroup.get(i.groupKey ?? i.id) ?? []), i])

  const cached = await db.notificationGroup.findMany({ where: { userId, groupKey: { in: [...byGroup.keys()] } } })
  const cacheByKey = new Map(cached.map((c) => [c.groupKey, c]))

  const groups: DigestGroup[] = [...byGroup.entries()].map(([key, members]) => {
    if (members.length === 1) return { summary: members[0].title, count: 1, titles: [members[0].title] }
    const c = cacheByKey.get(key)
    const summary = c && c.signature === memberSignature(members.map((m) => m.id)) ? c.summary : summarizeGroupWithRules(members[0].category, members.map((m) => m.title))
    return { summary, count: members.length, titles: members.map((m) => m.title) }
  })
  return { total: items.length, groups }
}

type RunOutcome = 'sent' | 'empty' | 'failed' | 'skipped'

/** Builds and sends one user's digest for a claimed DigestRun, then records the outcome. */
async function executeDigest(runId: string, userId: string, deps: DeliveryDeps): Promise<RunOutcome> {
  const now = deps.now()
  const run = await db.digestRun.findUniqueOrThrow({ where: { id: runId } })
  try {
    const user = await db.user.findUnique({ where: { id: userId }, select: { email: true, name: true } })
    if (!user) throw new DeliveryError('user missing', false)

    const last = await db.digestRun.findFirst({ where: { userId, status: 'SENT', itemCount: { gt: 0 } }, orderBy: { sentAt: 'desc' }, select: { sentAt: true } })
    const since = new Date(Math.max((last?.sentAt ?? new Date(now.getTime() - DAY_MS)).getTime(), now.getTime() - 3 * DAY_MS))
    const { total, groups } = await collectDigest(userId, since)

    if (total === 0) {
      await db.digestRun.update({ where: { id: runId }, data: { status: 'SENT', itemCount: 0, sentAt: now, error: null } }) // nothing to say: no email
      return 'empty'
    }
    await deps.email.sendDigest(user.email, {
      name: user.name,
      total,
      groups,
      openUrl: inboxUrl,
      unsubscribeUrl: unsubscribeUrl(userId, 'digest'),
      settingsUrl,
    })
    await db.digestRun.update({ where: { id: runId }, data: { status: 'SENT', itemCount: total, sentAt: now, error: null, attempts: { increment: 1 } } })
    return 'sent'
  } catch (err) {
    const retryable = err instanceof DeliveryError ? err.retryable : true
    await db.digestRun.update({
      where: { id: runId },
      data: {
        status: 'FAILED',
        attempts: retryable ? run.attempts + 1 : MAX_DIGEST_ATTEMPTS,
        nextAttemptAt: new Date(now.getTime() + RETRY_AFTER_MS * (run.attempts + 1)),
        error: (err instanceof Error ? err.message : 'unknown').slice(0, 200) },
    })
    log.warn(`[digest] run ${runId} failed (attempt ${run.attempts + 1})`)
    return 'failed'
  }
}

/**
 * Claims today's digest slot for a user. The unique (userId, localDate) key is the idempotency guarantee:
 * two sweeps, two instances or a restart can never produce two digests for the same local day.
 * A FAILED/crashed (stale PENDING) run may be reclaimed a limited number of times.
 */
async function claim(userId: string, localDate: string, now: Date): Promise<string | null> {
  // The unique (userId, localDate) key decides the winner; skipDuplicates turns a lost race into count 0 (no error log).
  const { count } = await db.digestRun.createMany({
    data: [{ userId, localDate, status: 'PENDING', nextAttemptAt: new Date(now.getTime() + CRASH_LEASE_MS) }],
    skipDuplicates: true,
  })
  if (count === 1) return (await db.digestRun.findUniqueOrThrow({ where: { userId_localDate: { userId, localDate } } })).id
  const run = await db.digestRun.findUnique({ where: { userId_localDate: { userId, localDate } } })
  if (!run || run.status === 'SENT' || run.status === 'SKIPPED' || run.attempts >= MAX_DIGEST_ATTEMPTS) return null
  // FAILED runs wait out their backoff; a PENDING run is only taken over once its crash lease has expired.
  if (!run.nextAttemptAt || run.nextAttemptAt.getTime() > now.getTime()) return null
  // Compare-and-set on nextAttemptAt so only one claimer wins.
  const won = await db.digestRun.updateMany({
    where: { id: run.id, nextAttemptAt: run.nextAttemptAt },
    data: { status: 'PENDING', nextAttemptAt: new Date(now.getTime() + CRASH_LEASE_MS) },
  })
  return won.count === 1 ? run.id : null
}

/**
 * Scheduler entry (every minute): for each user whose local time has passed their digest time and who has no
 * digest for today's local date yet, send it. Catches up after downtime; never double-sends.
 * ponytail: scans every digest-enabled user each minute; add a precomputed next-due column if users reach the many thousands.
 */
export async function runDigestSweep(deps: DeliveryDeps = defaultDeps()) {
  if (!deps.email.configured) return { claimed: 0 }
  const now = deps.now()
  const users = await db.userPreference.findMany({ where: { digestEnabled: true }, select: { userId: true, timeZone: true, digestTime: true } })
  let claimed = 0

  for (const u of users) {
    try {
      const local = localParts(now, u.timeZone)
      if (local.minutes < parseHHmm(u.digestTime)) continue
      const runId = await claim(u.userId, local.date, now)
      if (!runId) continue
      claimed++
      await executeDigest(runId, u.userId, deps)
    } catch (err) {
      log.error(`[digest] user ${u.userId} failed:`, err instanceof Error ? err.message : err)
    }
  }
  return { claimed }
}

/** Retention: behaviour events (90 days) and finished delivery rows (30 days). */
export async function purgeOldData(now = new Date()) {
  const days = (n: number) => new Date(now.getTime() - n * DAY_MS)
  await db.notificationEvent.deleteMany({ where: { createdAt: { lt: days(90) } } })
  await db.notificationDelivery.deleteMany({ where: { status: { in: ['SENT', 'FAILED', 'SKIPPED'] }, updatedAt: { lt: days(30) } } })
}


