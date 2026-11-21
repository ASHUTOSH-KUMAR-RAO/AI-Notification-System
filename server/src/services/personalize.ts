import type { Category, Priority } from './preferences.logic'

const ORDER: Priority[] = ['LOW', 'MEDIUM', 'HIGH']
const MIN_SAMPLES = 5 // below this the engagement score is too noisy to act on
const HIGH_ENGAGEMENT = 0.65
const LOW_ENGAGEMENT = 0.2

export interface PersonalizationInput {
  /** Priority chosen by the AI (or rules). */
  basePriority: Priority
  category: Category
  /** The user chose the priority themselves: it always wins. */
  userSet: boolean
  engagement: { score: number; samples: number } | null
  /** Counts of this user's feedback on other notifications of the same category. */
  categoryFeedback: { important: number; notImportant: number }
  /** Feedback on this very notification. */
  itemFeedback: 'IMPORTANT' | 'NOT_IMPORTANT' | null
}

export interface PersonalizationResult {
  priority: Priority
  /** One short sentence for the UI, or null when nothing was adjusted. */
  reason: string | null
}

const shift = (p: Priority, delta: -1 | 0 | 1): Priority => ORDER[Math.min(2, Math.max(0, ORDER.indexOf(p) + delta))]

/**
 * Final priority = AI priority nudged by at most ONE level using what the user does.
 * Precedence: user-set priority > feedback on this notification > learned behaviour (engagement + category feedback).
 */
export function personalizePriority(i: PersonalizationInput): PersonalizationResult {
  const unchanged: PersonalizationResult = { priority: i.basePriority, reason: null }
  if (i.userSet) return unchanged

  const label = i.category.toLowerCase()

  if (i.itemFeedback) {
    const delta = i.itemFeedback === 'IMPORTANT' ? 1 : -1
    const priority = shift(i.basePriority, delta)
    return priority === i.basePriority
      ? unchanged
      : { priority, reason: `You marked this as ${delta === 1 ? 'important' : 'not important'}` }
  }

  const signals: { delta: -1 | 1; reason: string }[] = []
  if (i.engagement && i.engagement.samples >= MIN_SAMPLES) {
    if (i.engagement.score >= HIGH_ENGAGEMENT) signals.push({ delta: 1, reason: `You usually open ${label} updates quickly` })
    else if (i.engagement.score <= LOW_ENGAGEMENT) signals.push({ delta: -1, reason: `You rarely open ${label} updates` })
  }
  const net = i.categoryFeedback.important - i.categoryFeedback.notImportant
  if (net >= 2) signals.push({ delta: 1, reason: `You marked similar ${label} notifications as important` })
  else if (net <= -2) signals.push({ delta: -1, reason: `You marked similar ${label} notifications as not important` })

  const total = signals.reduce((s, x) => s + x.delta, 0)
  const delta = (total > 0 ? 1 : total < 0 ? -1 : 0) as -1 | 0 | 1
  if (delta === 0) return unchanged
  // Learned behaviour must never quietly demote a security alert.
  if (delta === -1 && i.category === 'SECURITY' && i.basePriority === 'HIGH') return unchanged

  const priority = shift(i.basePriority, delta)
  if (priority === i.basePriority) return unchanged
  return { priority, reason: signals.filter((s) => s.delta === delta).map((s) => s.reason).join('. ') }
}

/**
 * Engagement score 0..1 for one category from the last 30 days.
 * Rewards opening and clicking (and opening fast), penalises dismissing without opening.
 */
export function computeEngagementScore(s: {
  total: number
  opened: number
  clicked: number
  dismissedUnopened: number
  medianOpenMs: number | null
}): number {
  if (s.total === 0) return 0.5
  const open = s.opened / s.total
  const click = s.clicked / s.total
  const dismiss = s.dismissedUnopened / s.total
  const speed = s.medianOpenMs == null ? 0 : Math.max(0, 1 - s.medianOpenMs / (24 * 60 * 60_000))
  return Math.min(1, Math.max(0, 0.55 * open + 0.2 * click + 0.25 * speed - 0.4 * dismiss))
}
