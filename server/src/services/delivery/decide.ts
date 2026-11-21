import { isQuietNow, PRIORITY_RANK, type Category, type Preferences, type Priority } from '../preferences.logic'

export type Action = 'SEND' | 'HOLD' | 'SKIP'

export interface Decision {
  inApp: Action
  email: Action
  push: Action
  reasons: string[]
}

export interface DecideInput {
  prefs: Preferences
  notification: { category: Category; priority: Priority; isSpam: boolean }
  now: Date
  /** True when the user has a live socket (a tab is open): push would only duplicate the toast. */
  userOnline?: boolean
}

/**
 * Which channels should this notification use right now? Pure function: all inputs are explicit.
 *  - spam never leaves the inbox; muted categories are silent
 *  - toast/push need priority >= the user's minimum
 *  - instant email is only for HIGH priority (everything else goes to the digest)
 *  - during quiet hours toasts are skipped and email/push are HELD until quiet hours end (HIGH may override)
 */
export function decideChannels({ prefs, notification: n, now, userOnline = false }: DecideInput): Decision {
  const none = (reason: string): Decision => ({ inApp: 'SKIP', email: 'SKIP', push: 'SKIP', reasons: [reason] })
  if (n.isSpam) return none('spam')
  const cat = prefs.categories[n.category]
  if (!cat.enabled) return none('category muted')

  const reasons: string[] = []
  const quiet = isQuietNow(prefs, now) && !(n.priority === 'HIGH' && prefs.quietAllowHigh)
  if (quiet) reasons.push('quiet hours')
  const meetsMin = PRIORITY_RANK[n.priority] >= PRIORITY_RANK[prefs.minAlertPriority]
  if (!meetsMin) reasons.push('below minimum priority')

  const inApp: Action = cat.channels.inApp && meetsMin && !quiet ? 'SEND' : 'SKIP'
  const email: Action = cat.channels.email && n.priority === 'HIGH' ? (quiet ? 'HOLD' : 'SEND') : 'SKIP'
  let push: Action = cat.channels.push && meetsMin ? (quiet ? 'HOLD' : 'SEND') : 'SKIP'
  if (push === 'SEND' && userOnline) {
    push = 'SKIP'
    reasons.push('user online')
  }
  return { inApp, email, push, reasons }
}
