import { db } from '../../config/db'
import { Prisma, type DeliveryChannel } from '../../generated/prisma/client'
import { isUserOnline } from '../../sockets/presence'
import { notificationEvents } from '../../utils/notificationEvents'
import { unsubscribeUrl } from '../../utils/unsubscribe'
import type { NotificationDto } from '../notification.service'
import { getPreferences } from '../preferences.service'
import { quietEndsAt } from '../preferences.logic'
import { decideChannels, type Decision } from './decide'
import { getEmailChannel, inboxUrl, settingsUrl, type EmailChannel } from './email.channel'
import { DeliveryError } from './errors'
import { getPushChannel, type PushChannel } from './push.channel'
import { CATEGORY_LABELS } from './labels'
import { log } from '../../utils/logger'

export interface DeliveryDeps {
  email: EmailChannel
  push: PushChannel
  now: () => Date
  isOnline: (userId: string) => Promise<boolean>
}

export const defaultDeps = (): DeliveryDeps => ({
  email: getEmailChannel(),
  push: getPushChannel(),
  now: () => new Date(),
  isOnline: isUserOnline,
})

export const MAX_ATTEMPTS = 4
/** Delay before retry #1, #2, #3 after a transient failure. */
export const BACKOFF_MS = [60_000, 5 * 60_000, 15 * 60_000]
/** An attempt "owns" a row this long; if the process dies mid-send the row becomes claimable again. */
const LEASE_MS = 2 * 60_000

const short = (s: string) => s.slice(0, 200)

/** Creates the delivery row; returns it, or null if one already exists for this notification+channel (idempotency). */
async function createRow(notificationId: string, userId: string, channel: DeliveryChannel, status: 'PENDING' | 'HELD' | 'SENT', nextAttemptAt: Date | null) {
  // createMany + skipDuplicates makes the "already exists" case a normal outcome instead of a logged database error.
  const { count } = await db.notificationDelivery.createMany({
    data: [{ notificationId, userId, channel, status, nextAttemptAt, ...(status === 'SENT' && { sentAt: new Date() }) }],
    skipDuplicates: true,
  })
  return count === 1 ? db.notificationDelivery.findUnique({ where: { notificationId_channel: { notificationId, channel } } }) : null
}
/**
 * In-app toast decision at creation time (instant, uses the provisional rule-based priority).
 * Records an IN_APP row so the same notification is never toasted twice.
 */
export async function shouldAlertInApp(userId: string, n: NotificationDto, deps = defaultDeps()): Promise<boolean> {
  const decision = decideChannels({ prefs: await getPreferences(userId), notification: n, now: deps.now() })
  if (decision.inApp !== 'SEND') return false
  return (await createRow(n.id, userId, 'IN_APP', 'SENT', null)) !== null
}

/**
 * Runs after AI analysis (priority is now final). Queues email/push and, if the AI raised the priority enough,
 * a late in-app alert. Safe to call repeatedly: rows are unique per notification+channel.
 */
export async function deliverAfterAnalysis(userId: string, n: NotificationDto, deps = defaultDeps()) {
  try {
    const prefs = await getPreferences(userId)
    const now = deps.now()
    const userOnline = await deps.isOnline(userId)
    const decision = decideChannels({ prefs, notification: n, now, userOnline })

    if (decision.inApp === 'SEND' && (await createRow(n.id, userId, 'IN_APP', 'SENT', null))) {
      notificationEvents.emit('alert', userId, n)
    }
    await queue(userId, n, 'EMAIL', decision.email, deps.email.configured, prefs, now, deps)
    const hasSubscription = decision.push === 'SKIP' ? false : (await db.pushSubscription.count({ where: { userId } })) > 0
    await queue(userId, n, 'PUSH', decision.push, deps.push.configured && hasSubscription, prefs, now, deps)
  } catch (err) {
    // Delivery problems must never surface to the notification flow.
    log.error(`[delivery] failed to queue deliveries for ${n.id}:`, err instanceof Error ? err.message : err)
  }
}

async function queue(
  userId: string,
  n: NotificationDto,
  channel: 'EMAIL' | 'PUSH',
  action: Decision['email'],
  available: boolean,
  prefs: Awaited<ReturnType<typeof getPreferences>>,
  now: Date,
  deps: DeliveryDeps,
) {
  if (action === 'SKIP' || !available) return // not configured / no subscription: nothing to track
  const row = await createRow(n.id, userId, channel, action === 'HOLD' ? 'HELD' : 'PENDING', action === 'HOLD' ? quietEndsAt(prefs, now) : now)
  if (row && action === 'SEND') void attemptDelivery(row.id, deps)
}

type RowWithNotification = Awaited<ReturnType<typeof loadRow>>
const loadRow = (id: string) => db.notificationDelivery.findUnique({ where: { id }, include: { notification: true } })

/**
 * One send attempt. Atomically claims the row first, so the inline attempt, the retry job and a second
 * server instance can never send the same delivery twice. `recheck` re-applies preferences (used for held
 * and retried rows, whose circumstances may have changed).
 */
export async function attemptDelivery(id: string, deps = defaultDeps(), { recheck = false } = {}) {
  try {
    const now = deps.now()
    const claimed = await db.notificationDelivery.updateMany({
      where: { id, status: { in: ['PENDING', 'HELD'] }, OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }] },
      data: { status: 'PENDING', nextAttemptAt: new Date(now.getTime() + LEASE_MS) },
    })
    if (claimed.count === 0) return

    const row = await loadRow(id)
    if (!row) return
    const skip = (reason: string) => db.notificationDelivery.update({ where: { id }, data: { status: 'SKIPPED', error: reason, nextAttemptAt: null } })

    const n = row.notification
    if (n.deletedAt) return void (await skip('notification deleted'))
    if (n.isSpam) return void (await skip('spam'))

    if (recheck) {
      if (n.isRead) return void (await skip('already read'))
      const prefs = await getPreferences(row.userId)
      const decision = decideChannels({ prefs, notification: n, now, userOnline: await deps.isOnline(row.userId) })
      const action = decision[row.channel === 'EMAIL' ? 'email' : 'push']
      if (action === 'SKIP') return void (await skip(decision.reasons.join(', ') || 'no longer wanted'))
      if (action === 'HOLD') {
        await db.notificationDelivery.update({ where: { id }, data: { status: 'HELD', nextAttemptAt: quietEndsAt(prefs, now) } })
        return
      }
    }

    try {
      const outcome = row.channel === 'EMAIL' ? await sendEmail(row, deps) : await sendPush(row, deps)
      if (outcome !== 'sent') return void (await skip(outcome))
      await db.notificationDelivery.update({ where: { id }, data: { status: 'SENT', sentAt: now, nextAttemptAt: null, error: null, attempts: { increment: 1 } } })
    } catch (err) {
      const retryable = err instanceof DeliveryError ? err.retryable : true
      const attempts = row.attempts + 1
      const willRetry = retryable && attempts < MAX_ATTEMPTS
      await db.notificationDelivery.update({
        where: { id },
        data: {
          attempts,
          status: willRetry ? 'PENDING' : 'FAILED',
          nextAttemptAt: willRetry ? new Date(now.getTime() + BACKOFF_MS[attempts - 1]) : null,
          error: short(err instanceof Error ? err.message : 'unknown error'),
        },
      })
      log.warn(`[delivery] ${row.channel} for ${id} failed (attempt ${attempts}${willRetry ? ', will retry' : ', giving up'})`)
    }
  } catch (err) {
    log.error(`[delivery] attempt ${id} crashed:`, err instanceof Error ? err.message : err)
  }
}

async function sendEmail(row: NonNullable<RowWithNotification>, deps: DeliveryDeps): Promise<'sent' | string> {
  if (!deps.email.configured) return 'email not configured'
  const [user, prefs] = await Promise.all([db.user.findUnique({ where: { id: row.userId }, select: { email: true } }), getPreferences(row.userId)])
  if (!user) return 'user missing'
  const n = row.notification
  void prefs
  await deps.email.sendNotification(user.email, {
    title: n.title,
    message: n.message,
    priority: n.priority,
    category: CATEGORY_LABELS[n.category],
    reason: n.personalizationReason ?? n.aiPriorityReason,
    openUrl: inboxUrl,
    unsubscribeUrl: unsubscribeUrl(row.userId, `category:${n.category}`),
    settingsUrl,
  })
  return 'sent'
}

async function sendPush(row: NonNullable<RowWithNotification>, deps: DeliveryDeps): Promise<'sent' | string> {
  if (!deps.push.configured) return 'push not configured'
  const subs = await db.pushSubscription.findMany({ where: { userId: row.userId } })
  if (subs.length === 0) return 'no subscription'
  const n = row.notification
  let delivered = 0
  let lastError: DeliveryError | null = null

  for (const sub of subs) {
    try {
      const r = await deps.push.send(sub, {
        title: n.title,
        body: n.message.slice(0, 160),
        url: `/notifications`,
        tag: n.id,
      })
      if (r === 'gone') await db.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {}) // expired: remove automatically
      else {
        delivered++
        await db.pushSubscription.update({ where: { id: sub.id }, data: { lastUsedAt: deps.now() } }).catch(() => {})
      }
    } catch (err) {
      lastError = err instanceof DeliveryError ? err : new DeliveryError('push failed', true)
    }
  }
  if (delivered > 0) return 'sent'
  if (lastError) throw lastError
  return 'subscription expired'
}

/** Scheduler entry: send held rows whose quiet hours ended, and retry failed attempts that are due. */
export async function releaseDueDeliveries(deps = defaultDeps()) {
  const due = await db.notificationDelivery.findMany({
    where: { status: { in: ['PENDING', 'HELD'] }, nextAttemptAt: { lte: deps.now() } },
    orderBy: { nextAttemptAt: 'asc' },
    take: 100,
    select: { id: true },
  })
  for (const { id } of due) await attemptDelivery(id, deps, { recheck: true })
  return due.length
}

