import { CATEGORIES, PRIORITIES } from '../validators/notification.validators'
import { isValidTimeZone, localParts, nextLocalTime, parseHHmm } from '../utils/time'

export type Category = (typeof CATEGORIES)[number]
export type Priority = (typeof PRIORITIES)[number]

export interface CategoryPref {
  enabled: boolean // false = muted: saved to the inbox, but no toast, push or email
  channels: { inApp: boolean; email: boolean; push: boolean }
}

export interface Preferences {
  categories: Record<Category, CategoryPref>
  /** Minimum priority for toasts and push. */
  minAlertPriority: Priority
  quietHoursEnabled: boolean
  quietStart: string
  quietEnd: string
  timeZone: string
  quietAllowHigh: boolean
  digestEnabled: boolean
  digestTime: string
}

export type PreferencesPatch = Partial<Omit<Preferences, 'categories'>> & {
  categories?: { [C in Category]?: { enabled?: boolean; channels?: Partial<CategoryPref['channels']> } }
}

export const PRIORITY_RANK: Record<Priority, number> = { LOW: 0, MEDIUM: 1, HIGH: 2 }

/** Opt-in defaults: in-app alerts on, email and push off until the user enables them. */
export function defaultPreferences(): Preferences {
  const categories = Object.fromEntries(
    CATEGORIES.map((c) => [c, { enabled: true, channels: { inApp: true, email: false, push: false } }]),
  ) as Record<Category, CategoryPref>
  return {
    categories,
    minAlertPriority: 'LOW',
    quietHoursEnabled: false,
    quietStart: '22:00',
    quietEnd: '07:00',
    timeZone: 'UTC',
    quietAllowHigh: true,
    digestEnabled: false,
    digestTime: '08:00',
  }
}

/** Applies a partial update (merging per category/channel) and returns a new object. */
export function mergePreferences(current: Preferences, patch: PreferencesPatch): Preferences {
  const { categories: catPatch, ...rest } = patch
  const categories = { ...current.categories }
  for (const c of CATEGORIES) {
    const p = catPatch?.[c]
    if (!p) continue
    categories[c] = {
      enabled: p.enabled ?? categories[c].enabled,
      channels: { ...categories[c].channels, ...p.channels },
    }
  }
  return { ...current, ...stripUndefined(rest), categories }
}

const stripUndefined = <T extends object>(o: T) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T

/** Rebuilds Preferences from a DB row, tolerating missing/extra categories in the JSON column. */
export function fromRow(row: Omit<Preferences, 'categories'> & { categories: unknown }): Preferences {
  const defaults = defaultPreferences()
  const stored = (row.categories ?? {}) as Partial<Record<Category, Partial<CategoryPref>>>
  const categories = { ...defaults.categories }
  for (const c of CATEGORIES) {
    const s = stored[c]
    if (s) categories[c] = { enabled: s.enabled ?? true, channels: { ...defaults.categories[c].channels, ...s.channels } }
  }
  return {
    categories,
    minAlertPriority: row.minAlertPriority,
    quietHoursEnabled: row.quietHoursEnabled,
    quietStart: row.quietStart,
    quietEnd: row.quietEnd,
    timeZone: isValidTimeZone(row.timeZone) ? row.timeZone : 'UTC',
    quietAllowHigh: row.quietAllowHigh,
    digestEnabled: row.digestEnabled,
    digestTime: row.digestTime,
  }
}

type QuietPrefs = Pick<Preferences, 'quietHoursEnabled' | 'quietStart' | 'quietEnd' | 'timeZone'>

/** True while the user's local clock is inside [quietStart, quietEnd). Windows may wrap midnight (22:00-07:00). */
export function isQuietNow(p: QuietPrefs, now: Date): boolean {
  if (!p.quietHoursEnabled) return false
  const start = parseHHmm(p.quietStart)
  const end = parseHHmm(p.quietEnd)
  if (start === end) return false // an empty window
  const m = localParts(now, p.timeZone).minutes
  return start < end ? m >= start && m < end : m >= start || m < end
}

/** The instant quiet hours next end (when held notifications should be released). */
export const quietEndsAt = (p: QuietPrefs, now: Date) => nextLocalTime(now, p.quietEnd, p.timeZone)
