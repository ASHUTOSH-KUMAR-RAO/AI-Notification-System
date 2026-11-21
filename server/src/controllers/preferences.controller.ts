import { assertNotDemo, isDemoUser, lockDemoPatch } from '../config/demo'
import { db } from '../config/db'
import { getPreferencesView, updatePreferences } from '../services/preferences.service'
import type { PreferencesPatch } from '../services/preferences.logic'
import { asyncHandler } from '../utils/asyncHandler'
import { sendSuccess } from '../utils/response'

const uid = (req: { user?: { id: string } }) => req.user!.id

export const getPrefs = asyncHandler(async (req, res) => {
  sendSuccess(res, await getPreferencesView(uid(req)), 'OK')
})

export const updatePrefs = asyncHandler(async (req, res) => {
  const patch = req.body as PreferencesPatch
  await updatePreferences(uid(req), isDemoUser(req.user) ? lockDemoPatch(patch) : patch)
  sendSuccess(res, await getPreferencesView(uid(req)), 'Preferences saved')
})

export const pushSubscribe = asyncHandler(async (req, res) => {
  assertNotDemo(req.user, 'Push notifications')
  const { endpoint, keys } = req.body as { endpoint: string; keys: { p256dh: string; auth: string } }
  // An endpoint belongs to one browser profile: if another account used it before, it moves to the current user.
  await db.pushSubscription.upsert({
    where: { endpoint },
    create: { userId: uid(req), endpoint, p256dh: keys.p256dh, auth: keys.auth, userAgent: req.get('user-agent')?.slice(0, 200) },
    update: { userId: uid(req), p256dh: keys.p256dh, auth: keys.auth },
  })
  sendSuccess(res, null, 'Push enabled', 201)
})

export const pushUnsubscribe = asyncHandler(async (req, res) => {
  await db.pushSubscription.deleteMany({ where: { endpoint: (req.body as { endpoint: string }).endpoint, userId: uid(req) } })
  sendSuccess(res, null, 'Push disabled')
})
