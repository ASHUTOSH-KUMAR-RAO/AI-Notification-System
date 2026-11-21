import { db } from '../config/db'
import { AppError } from '../utils/AppError'
import { notificationEvents } from '../utils/notificationEvents'
import { notificationSelect } from './notification.service'
import { computeEngagementScore, personalizePriority } from './personalize'
import type { Category } from './preferences.logic'
import { log } from '../utils/logger'

const DAY_MS = 24 * 60 * 60_000
const WINDOW_DAYS = 30

type EventType = 'OPENED' | 'CLICKED' | 'DISMISSED'

/**
 * Stores the user's own interactions (opened / clicked / dismissed) for notifications they own.
 * At most one of each type per notification; time-to-open is measured on the server.
 */
export async function recordEvents(userId: string, events: { notificationId: string; type: EventType }[], now = new Date()) {
  const ids = [...new Set(events.map((e) => e.notificationId))]
  // Deleted (dismissed) notifications still exist as soft-deleted rows, so they are included here.
  const owned = await db.notification.findMany({ where: { id: { in: ids }, userId }, select: { id: true, createdAt: true, category: true } })
  const byId = new Map(owned.map((n) => [n.id, n]))

  const rows = events.flatMap((e) => {
    const n = byId.get(e.notificationId)
    if (!n) return []
    return [{ userId, notificationId: n.id, type: e.type, timeToOpenMs: e.type === 'OPENED' ? Math.max(0, now.getTime() - n.createdAt.getTime()) : null }]
  })
  if (rows.length === 0) return { recorded: 0 }

  const { count } = await db.notificationEvent.createMany({ data: rows, skipDuplicates: true })
  if (count > 0) scheduleEngagementUpdate(userId, [...new Set(rows.map((r) => byId.get(r.notificationId)!.category))])
  return { recorded: count }
}

// ---- engagement score (background, debounced per user) ----
const pending = new Map<string, { categories: Set<Category>; timer: ReturnType<typeof setTimeout> }>()

export function scheduleEngagementUpdate(userId: string, categories: Category[], delayMs = 5_000) {
  const entry = pending.get(userId) ?? { categories: new Set<Category>(), timer: undefined as never }
  categories.forEach((c) => entry.categories.add(c))
  clearTimeout(entry.timer)
  entry.timer = setTimeout(() => {
    pending.delete(userId)
    for (const c of entry.categories)
      recomputeEngagement(userId, c).catch((err) => log.error('[engagement] update failed:', err instanceof Error ? err.message : err))
  }, delayMs)
  entry.timer.unref?.()
  pending.set(userId, entry)
}

export async function recomputeEngagement(userId: string, category: Category, now = new Date()) {
  const since = new Date(now.getTime() - WINDOW_DAYS * DAY_MS)
  const [total, events] = await Promise.all([
    db.notification.count({ where: { userId, category, isSpam: false, createdAt: { gte: since } } }), // includes soft-deleted
    db.notificationEvent.findMany({ where: { userId, createdAt: { gte: since }, notification: { category, isSpam: false } }, select: { notificationId: true, type: true, timeToOpenMs: true } }),
  ])
  const opened = new Set(events.filter((e) => e.type === 'OPENED').map((e) => e.notificationId))
  const clicked = new Set(events.filter((e) => e.type === 'CLICKED').map((e) => e.notificationId))
  const dismissedUnopened = events.filter((e) => e.type === 'DISMISSED' && !opened.has(e.notificationId)).length
  const times = events.filter((e) => e.type === 'OPENED' && e.timeToOpenMs != null).map((e) => e.timeToOpenMs as number).sort((a, b) => a - b)
  const medianOpenMs = times.length ? times[Math.floor(times.length / 2)] : null

  const score = computeEngagementScore({ total, opened: opened.size, clicked: clicked.size, dismissedUnopened, medianOpenMs })
  await db.engagementScore.upsert({
    where: { userId_category: { userId, category } },
    create: { userId, category, score, samples: total, medianOpenMs },
    update: { score, samples: total, medianOpenMs },
  })
}

/** What we know about this user's habits in a category: engagement score + their importance feedback. */
export async function getPersonalizationContext(userId: string, category: Category) {
  const [engagement, feedback] = await Promise.all([
    db.engagementScore.findUnique({ where: { userId_category: { userId, category } } }),
    db.notification.groupBy({ by: ['feedback'], where: { userId, category, feedback: { not: null } }, _count: { _all: true } }),
  ])
  const count = (v: 'IMPORTANT' | 'NOT_IMPORTANT') => feedback.find((f) => f.feedback === v)?._count._all ?? 0
  return {
    engagement: engagement ? { score: engagement.score, samples: engagement.samples } : null,
    categoryFeedback: { important: count('IMPORTANT'), notImportant: count('NOT_IMPORTANT') },
  }
}

/** "Was this important?" - stores it and re-personalizes this notification at once. Pass null to clear. */
export async function giveFeedback(userId: string, id: string, value: 'IMPORTANT' | 'NOT_IMPORTANT' | null) {
  const n = await db.notification.findFirst({ where: { id, userId, deletedAt: null } })
  if (!n) throw new AppError('Notification not found', 404)

  // `aiPriority` is the stable baseline; old rows without one use their current priority as the baseline.
  const base = n.aiPriority ?? n.priority
  const ctx = await getPersonalizationContext(userId, n.category)
  const { priority, reason } = personalizePriority({
    basePriority: base,
    category: n.category,
    userSet: n.prioritySetByUser,
    engagement: ctx.engagement,
    categoryFeedback: ctx.categoryFeedback,
    itemFeedback: value,
  })

  const updated = await db.notification.update({
    where: { id },
    data: { feedback: value, aiPriority: base, ...(n.prioritySetByUser ? {} : { priority, personalizationReason: reason }) },
    select: notificationSelect,
  })
  notificationEvents.emit('updated', userId, updated)
  return updated
}
