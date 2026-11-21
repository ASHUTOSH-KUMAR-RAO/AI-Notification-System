import { giveFeedback, recordEvents } from '../services/engagement.service'
import { asyncHandler } from '../utils/asyncHandler'
import { sendSuccess } from '../utils/response'

const uid = (req: { user?: { id: string } }) => req.user!.id

type Ev = { type: 'OPENED' | 'CLICKED' | 'DISMISSED' }

/** Batched from the client: events for many notifications in one request. */
export const events = asyncHandler(async (req, res) => {
  const { events } = req.body as { events: (Ev & { notificationId: string })[] }
  sendSuccess(res, await recordEvents(uid(req), events), 'OK')
})

/** Same, scoped to one notification (the id comes from the path). */
export const notificationEvents = asyncHandler(async (req, res) => {
  const { id } = req.validated!.params as { id: string }
  const { events } = req.body as { events: Ev[] }
  sendSuccess(res, await recordEvents(uid(req), events.map((e) => ({ notificationId: id, type: e.type }))), 'OK')
})

export const feedback = asyncHandler(async (req, res) => {
  const { id } = req.validated!.params as { id: string }
  const { value } = req.body as { value: 'IMPORTANT' | 'NOT_IMPORTANT' | null }
  sendSuccess(res, { notification: await giveFeedback(uid(req), id, value) }, 'Thanks for the feedback')
})
