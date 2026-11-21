import crypto from 'node:crypto'
import { db } from '../config/db'
import { AppError } from '../utils/AppError'
import { notificationEvents } from '../utils/notificationEvents'
import { getAiMode, summarizeGroup } from './ai/analysis.service'
import { isAiEnabled } from './ai/llm'
import type { Category } from './ai/schemas'
import { notificationSelect, type NotificationDto } from './notification.service'
import { log } from '../utils/logger'

/** Notifications of the same user and category created within this window share a group. */
export const GROUP_WINDOW_MS = 15 * 60_000
const FALLBACK_SUMMARY_RETRY_MS = 2 * 60_000

/**
 * Picks the groupKey for a notification: that of the most recent earlier notification with the same category
 * inside the window, otherwise its own id (a group of one). Spam is never grouped.
 * ponytail: concurrent creations can end up in separate groups; fine for the 15-minute heuristic.
 */
export async function findGroupKey(n: { id: string; userId: string; createdAt: Date }, category: Category, isSpam: boolean) {
  if (isSpam) return n.id
  const neighbour = await db.notification.findFirst({
    where: {
      userId: n.userId,
      category,
      isSpam: false,
      deletedAt: null,
      id: { not: n.id },
      createdAt: { gte: new Date(n.createdAt.getTime() - GROUP_WINDOW_MS), lte: n.createdAt },
    },
    orderBy: { createdAt: 'desc' },
    select: { groupKey: true },
  })
  return neighbour?.groupKey ?? n.id
}

export const memberSignature = (ids: string[]) =>
  crypto.createHash('sha256').update([...ids].sort().join(',')).digest('hex')

const inflight = new Set<string>()

/**
 * Regenerates the cached AI summary of a group, but only when its membership changed (signature differs).
 * Runs in the background, deduplicated per group, and tells clients via `groups-updated`.
 */
export function scheduleGroupSummary(userId: string, groupKey: string, { force = false } = {}) {
  const flight = `${userId}:${groupKey}`
  if (inflight.has(flight)) return
  inflight.add(flight)

  void (async () => {
    const members = await db.notification.findMany({
      where: { userId, groupKey, deletedAt: null, isSpam: false },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: { id: true, title: true, message: true, category: true },
    })
    if (members.length < 2) return

    const signature = memberSignature(members.map((m) => m.id))
    const cached = await db.notificationGroup.findUnique({ where: { userId_groupKey: { userId, groupKey } } })
    if (!force && cached?.signature === signature && cached.source === 'AI') return

    const result = await summarizeGroup(userId, members[0].category, members)
    await db.notificationGroup.upsert({
      where: { userId_groupKey: { userId, groupKey } },
      create: { userId, groupKey, signature, summary: result.value, source: result.source === 'ai' ? 'AI' : 'FALLBACK' },
      update: { signature, summary: result.value, source: result.source === 'ai' ? 'AI' : 'FALLBACK' },
    })
    notificationEvents.emit('groups-updated', userId)
  })()
    .catch((err) => log.error('[ai] group summary failed:', err instanceof Error ? err.message : err))
    .finally(() => inflight.delete(flight))
}

export interface GroupDto {
  groupKey: string
  count: number
  unreadCount: number
  latestAt: Date
  /** null for a single notification (no group to summarise). */
  summary: string | null
  summarySource: 'AI' | 'FALLBACK' | null
  items: NotificationDto[]
}

const encodeCursor = (d: Date) => Buffer.from(String(d.getTime())).toString('base64url')
const decodeCursor = (c: string) => new Date(Number(Buffer.from(c, 'base64url').toString()))

/**
 * Grouped view: groups ordered by their newest member, cursor-paginated by that timestamp.
 * Never waits for AI: it returns the cached summary (or an instant rule-based one) and refreshes stale ones in the background.
 */
export async function listGroups(userId: string, q: { limit: number; cursor?: string }) {
  const cursorDate = q.cursor ? decodeCursor(q.cursor) : null
  if (cursorDate && Number.isNaN(cursorDate.getTime())) throw new AppError('Invalid cursor', 400)

  const rows = await db.notification.groupBy({
    by: ['groupKey'],
    where: { userId, deletedAt: null, isSpam: false, groupKey: { not: null } },
    _max: { createdAt: true },
    having: cursorDate ? { createdAt: { _max: { lt: cursorDate } } } : undefined,
    orderBy: { _max: { createdAt: 'desc' } },
    take: q.limit + 1,
  })
  const hasMore = rows.length > q.limit
  const page = hasMore ? rows.slice(0, q.limit) : rows
  const keys = page.map((r) => r.groupKey as string)

  const [notifications, cached] = await Promise.all([
    db.notification.findMany({
      where: { userId, groupKey: { in: keys }, deletedAt: null, isSpam: false },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: notificationSelect,
      take: 500,
    }),
    db.notificationGroup.findMany({ where: { userId, groupKey: { in: keys } } }),
  ])
  const cacheByKey = new Map(cached.map((c) => [c.groupKey, c]))
  const byKey = new Map<string, NotificationDto[]>()
  for (const n of notifications) byKey.set(n.groupKey as string, [...(byKey.get(n.groupKey as string) ?? []), n])

  // A group can vanish between the two queries (the pipeline re-keys notifications into existing groups), so drop empty ones.
  const groups: GroupDto[] = page.flatMap((r) => {
    const key = r.groupKey as string
    const items = byKey.get(key) ?? []
    if (items.length === 0) return []
    let summary: string | null = null
    let summarySource: GroupDto['summarySource'] = null

    if (items.length >= 2) {
      const c = cacheByKey.get(key)
      const fresh = c?.signature === memberSignature(items.map((i) => i.id))
      if (c && fresh) {
        summary = c.summary
        summarySource = c.source === 'AI' ? 'AI' : 'FALLBACK'
        // A rule-based summary is retried once the AI is healthy again.
        const stale = c.source !== 'AI' && Date.now() - c.updatedAt.getTime() > FALLBACK_SUMMARY_RETRY_MS
        if (stale && isAiEnabled() && getAiMode() === 'ai') scheduleGroupSummary(userId, key, { force: true })
      } else {
        summary = `${items.length} ${items[0].category.toLowerCase()} updates: ${items.slice(0, 3).map((i) => i.title).join(', ')}${items.length > 3 ? ', ...' : ''}`
        summarySource = 'FALLBACK'
        scheduleGroupSummary(userId, key)
      }
    }
    return [
      {
        groupKey: key,
        count: items.length,
        unreadCount: items.filter((i) => !i.isRead).length,
        latestAt: r._max.createdAt as Date,
        summary,
        summarySource,
        items,
      },
    ]
  })
  const last = page[page.length - 1]
  return { groups, nextCursor: hasMore && last ? encodeCursor(last._max.createdAt as Date) : null }
}



