import { Router } from 'express'
import * as c from '../controllers/notification.controller'
import { aiLimiter, eventsLimiter } from '../middlewares/rateLimiter'
import * as e from '../controllers/engagement.controller'
import { protect } from '../middlewares/auth.middleware'
import { validate, validateBody } from '../middlewares/validate.middleware'
import { eventsBatchSchema, feedbackSchema, notificationEventsSchema } from '../validators/preferences.validators'
import {
  bulkDeleteSchema,
  createNotificationSchema,
  idParamSchema,
  listNotificationsQuerySchema,
} from '../validators/notification.validators'

export const notificationRouter = Router()

notificationRouter.use(protect)

notificationRouter.post('/', validateBody(createNotificationSchema), c.create)
notificationRouter.get('/', validate('query', listNotificationsQuerySchema), c.list)
notificationRouter.delete('/', validateBody(bulkDeleteSchema), c.removeMany)

// Static paths must be registered before '/:id' routes.
notificationRouter.post('/events', eventsLimiter, validateBody(eventsBatchSchema), e.events)
notificationRouter.get('/unread-count', c.unreadCount)
notificationRouter.get('/ai-status', c.aiStatus)
notificationRouter.patch('/read-all', c.markAllRead)

// AI: re-analysis costs tokens, so it gets its own limit on top of the per-user AI budget.
notificationRouter.post('/:id/reanalyze', aiLimiter, validate('params', idParamSchema), c.reanalyze)
notificationRouter.post('/:id/events', eventsLimiter, validate('params', idParamSchema), validateBody(notificationEventsSchema), e.notificationEvents)
notificationRouter.post('/:id/feedback', validate('params', idParamSchema), validateBody(feedbackSchema), e.feedback)
notificationRouter.patch('/:id/not-spam', validate('params', idParamSchema), c.notSpam)
notificationRouter.patch('/:id/read', validate('params', idParamSchema), c.markRead)
notificationRouter.delete('/:id', validate('params', idParamSchema), c.remove)


