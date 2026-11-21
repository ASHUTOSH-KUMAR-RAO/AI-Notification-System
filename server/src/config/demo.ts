import type { PreferencesPatch } from '../services/preferences.logic'
import { AppError } from '../utils/AppError'

/** The shared public demo account created by `npm run seed:demo`. */
export const DEMO_EMAIL = 'demo@notify.dev'
export const isDemoUser = (user?: { email: string }) => user?.email === DEMO_EMAIL

/**
 * The demo login is shared with anyone who visits, so it must never be able to send email or push
 * (that would let visitors spam third parties or burn the email quota). Settings can still be changed otherwise.
 */
export function lockDemoPatch(patch: PreferencesPatch): PreferencesPatch {
  const categories = Object.fromEntries(
    Object.entries(patch.categories ?? {}).map(([c, p]) => [c, p && { ...p, channels: p.channels && { ...p.channels, email: false, push: false } }]),
  ) as PreferencesPatch['categories']
  return { ...patch, ...(patch.categories && { categories }), ...(patch.digestEnabled && { digestEnabled: false }) }
}

export function assertNotDemo(user: { email: string } | undefined, action: string) {
  if (isDemoUser(user)) throw new AppError(`${action} is disabled for the shared demo account`, 403)
}
