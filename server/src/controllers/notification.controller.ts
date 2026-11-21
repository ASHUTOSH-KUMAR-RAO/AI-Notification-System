import { getAiMode } from '../services/ai/analysis.service'
import { isAiEnabled } from '../services/ai/llm'
import * as ai from '../services/notification.ai'
import { listGroups } from '../services/notification.groups'
import * as service from '../services/notification.service'
import { asyncHandler } from '../utils/asyncHandler'
import { sendSuccess } from '../utils/response'
import type {
  CreateNotificationInput,
  ListNotificationsQuery,
} from '../validators/notification.validators'

// protect guarantees req.user; validated bodies/params/queries come from the validate middleware.
const uid = (req: { user?: { id: string } }) => req.user!.id
const params = (req: { validated?: { params?: unknown } }) => req.validated!.params as { id: string }

export const create = asyncHandler(async (req, res) => {
  const data = await service.createNotification(uid(req), req.body as CreateNotificationInput)
  sendSuccess(res, { notification: data }, 'Notification created', 201)
})

export const list = asyncHandler(async (req, res) => {
  const q = req.validated!.query as ListNotificationsQuery
  const data = q.view === 'grouped' ? await listGroups(uid(req), q) : await service.listNotifications(uid(req), q)
  sendSuccess(res, data, 'OK')
})

export const unreadCount = asyncHandler(async (req, res) => {
  sendSuccess(res, { count: await service.getUnreadCount(uid(req)) }, 'OK')
})

export const markRead = asyncHandler(async (req, res) => {
  const notification = await service.markRead(uid(req), params(req).id)
  sendSuccess(res, { notification }, 'Marked as read')
})

export const markAllRead = asyncHandler(async (req, res) => {
  sendSuccess(res, await service.markAllRead(uid(req)), 'All notifications marked as read')
})

export const remove = asyncHandler(async (req, res) => {
  await service.deleteNotification(uid(req), params(req).id)
  sendSuccess(res, null, 'Notification deleted')
})

export const removeMany = asyncHandler(async (req, res) => {
  const { ids } = req.body as { ids: string[] }
  sendSuccess(res, await service.deleteNotifications(uid(req), ids), 'Notifications deleted')
})

export const reanalyze = asyncHandler(async (req, res) => {
  sendSuccess(res, { notification: await ai.reanalyze(uid(req), params(req).id) }, 'Re-analysis started', 202)
})

export const notSpam = asyncHandler(async (req, res) => {
  sendSuccess(res, { notification: await ai.markNotSpam(uid(req), params(req).id) }, 'Marked as not spam')
})

/** Lets the UI show "smart sorting limited" without exposing any provider details. */
export const aiStatus = asyncHandler(async (_req, res) => {
  sendSuccess(res, { enabled: isAiEnabled(), mode: getAiMode() }, 'OK')
})
