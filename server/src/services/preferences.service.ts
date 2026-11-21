import { db } from '../config/db'
import type { Prisma } from '../generated/prisma/client'
import { emailConfigured, pushConfigured } from '../config/env'
import { env } from '../config/env'
import { fromRow, defaultPreferences, isQuietNow, mergePreferences, quietEndsAt, type Preferences, type PreferencesPatch } from './preferences.logic'

const CACHE_MS = 30_000
const cache = new Map<string, { prefs: Preferences; at: number }>()

const toColumns = (p: Preferences) => ({
  categories: p.categories as unknown as Prisma.InputJsonObject,
  minAlertPriority: p.minAlertPriority,
  quietHoursEnabled: p.quietHoursEnabled,
  quietStart: p.quietStart,
  quietEnd: p.quietEnd,
  timeZone: p.timeZone,
  quietAllowHigh: p.quietAllowHigh,
  digestEnabled: p.digestEnabled,
  digestTime: p.digestTime,
})

/** Returns the user's preferences, creating the default row on first access. Cached briefly (this runs on every notification). */
export async function getPreferences(userId: string): Promise<Preferences> {
  const hit = cache.get(userId)
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.prefs

  let row = await db.userPreference.findUnique({ where: { userId } })
  if (!row) {
    try {
      row = await db.userPreference.create({ data: { userId, ...toColumns(defaultPreferences()) } })
    } catch {
      row = await db.userPreference.findUnique({ where: { userId } }) // lost a creation race: use the winner
    }
  }
  const prefs = fromRow(row!)
  cache.set(userId, { prefs, at: Date.now() })
  return prefs
}

export async function updatePreferences(userId: string, patch: PreferencesPatch): Promise<Preferences> {
  const merged = mergePreferences(await getPreferences(userId), patch)
  await db.userPreference.upsert({ where: { userId }, create: { userId, ...toColumns(merged) }, update: toColumns(merged) })
  cache.set(userId, { prefs: merged, at: Date.now() })
  return merged
}

/** Everything the settings screen needs in one call. */
export async function getPreferencesView(userId: string, now = new Date()) {
  const [preferences, subscriptions] = await Promise.all([getPreferences(userId), db.pushSubscription.count({ where: { userId } })])
  const active = isQuietNow(preferences, now)
  return {
    preferences,
    channels: {
      email: { configured: emailConfigured },
      push: { configured: pushConfigured, publicKey: pushConfigured ? env.VAPID_PUBLIC_KEY ?? null : null, subscriptions },
    },
    quiet: { active, endsAt: active ? quietEndsAt(preferences, now).toISOString() : null },
  }
}

/** Applies a signed unsubscribe link: either the daily digest or one category's emails. */
export async function applyUnsubscribe(userId: string, scope: string) {
  if (scope === 'digest') return updatePreferences(userId, { digestEnabled: false })
  const category = scope.startsWith('category:') ? scope.slice('category:'.length) : ''
  if (!(category in defaultPreferences().categories)) return null
  return updatePreferences(userId, { categories: { [category]: { channels: { email: false } } } })
}
