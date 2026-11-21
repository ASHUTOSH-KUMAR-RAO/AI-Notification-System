import { withRetry } from '../utils/retry'
import { db } from '../config/db'
import { AppError } from '../utils/AppError'
import { notificationEvents } from '../utils/notificationEvents'
import { analyzeNotification } from './ai/analysis.service'
import { isAiEnabled } from './ai/llm'
import { deliverAfterAnalysis } from './delivery/delivery.service'
import { getPersonalizationContext } from './engagement.service'
import { findGroupKey, scheduleGroupSummary } from './notification.groups'
import { personalizePriority } from './personalize'
import { notificationSelect } from './notification.service'
import { log } from '../utils/logger'

const select = notificationSelect

/**
 * Background AI step for one notification: analyse (LLM or rules), apply the result, group it, then
 * emit `updated` so every open tab refreshes live. Never throws: failure marks the notification FAILED
 * and leaves it fully usable with its instant rule-based values.
 */
export async function processNotification(userId: string, id: string, { force = false } = {}) {
  try {
    const n = await db.notification.findFirst({ where: { id, userId, deletedAt: null } })
    if (!n) return

    const { value: a, source } = await analyzeNotification({
      userId,
      title: n.title,
      message: n.message,
      categoryHint: n.categorySetByUser ? n.category : undefined,
      force,
    })

    // Rules of precedence: what the user set always wins; "Not spam" is final.
    const isSpam = n.spamReviewed ? false : a.isSpam
    const category = n.categorySetByUser ? n.category : a.category
    // AI priority, nudged by what this user actually does (never overriding a priority they set themselves).
    const ctx = await getPersonalizationContext(userId, category)
    const personal = personalizePriority({
      basePriority: a.priority,
      category,
      userSet: n.prioritySetByUser,
      engagement: ctx.engagement,
      categoryFeedback: ctx.categoryFeedback,
      itemFeedback: n.feedback,
    })
    const priority = n.prioritySetByUser ? n.priority : personal.priority
    const groupKey = await findGroupKey(n, category, isSpam)

    const updated = await db.notification.update({
      where: { id },
      data: {
        aiStatus: source === 'ai' ? 'DONE' : 'FALLBACK',
        aiPriorityReason: a.reason,
        priority,
        aiPriority: a.priority,
        personalizationReason: personal.reason,
        category,
        isSpam,
        spamScore: a.spamScore,
        summary: a.summary,
        groupKey,
        analyzedAt: new Date(),
      },
      select,
    })
    notificationEvents.emit('updated', userId, updated)
    if (!isSpam) scheduleGroupSummary(userId, groupKey)
    void deliverAfterAnalysis(userId, updated) // email / push / late in-app alert, never blocks or throws
  } catch (err) {
    log.error(`[ai] pipeline failed for notification ${id}:`, err instanceof Error ? err.message : err)
    try {
      const failed = await db.notification.update({ where: { id }, data: { aiStatus: 'FAILED' }, select })
      notificationEvents.emit('updated', userId, failed)
    } catch {
      // The notification was deleted meanwhile; nothing to report.
    }
  }
}

/** Subscribes the pipeline to new notifications and recovers any left PENDING by a crash/restart. */
export function registerAiPipeline() {
  notificationEvents.on('created', (userId, n) => void processNotification(userId, n.id))

  // Retried: the first query after boot can hit a connection the pooler has already closed.
  void withRetry(() =>
    db.notification.findMany({
      where: { aiStatus: 'PENDING', createdAt: { lt: new Date(Date.now() - 60_000) } },
      select: { id: true, userId: true },
      take: 50,
    }),
  )
    .then((rows) => rows.forEach((r) => void processNotification(r.userId, r.id)))
    .catch((err) => log.error('[ai] pending recovery failed:', err instanceof Error ? err.message : err))
}

async function findOwned(userId: string, id: string) {
  const n = await db.notification.findFirst({ where: { id, userId, deletedAt: null }, select: { id: true } })
  if (!n) throw new AppError('Notification not found', 404)
}

/** Re-runs analysis with the smarter model, skipping the cache. Returns at once; the result arrives via `updated`. */
export async function reanalyze(userId: string, id: string) {
  await findOwned(userId, id)
  const pending = await db.notification.update({
    where: { id },
    data: { aiStatus: isAiEnabled() ? 'PENDING' : 'FALLBACK' },
    select,
  })
  notificationEvents.emit('updated', userId, pending)
  void processNotification(userId, id, { force: true })
  return pending
}

/** "Not spam" is permanent for this notification (AI will not flag it again) and puts it back in the normal views. */
export async function markNotSpam(userId: string, id: string) {
  await findOwned(userId, id)
  const base = await db.notification.findUniqueOrThrow({ where: { id } })
  const groupKey = await findGroupKey(base, base.category, false)
  const updated = await db.notification.update({
    where: { id },
    data: { isSpam: false, spamReviewed: true, groupKey },
    select,
  })
  notificationEvents.emit('updated', userId, updated)
  scheduleGroupSummary(userId, groupKey)
  void deliverAfterAnalysis(userId, updated) // it may now qualify for email/push
  return updated
}

