import { Router } from 'express'
import { analyticsRouter } from './analytics.routes'
import { authRouter } from './auth.routes'
import { healthRouter } from './health.routes'
import { notificationRouter } from './notification.routes'
import { preferencesRouter, pushRouter } from './preferences.routes'
import { unsubscribe, unsubscribePage } from '../controllers/unsubscribe.controller'

export const apiRouter = Router()
apiRouter.use('/health', healthRouter)
apiRouter.use('/auth', authRouter)
apiRouter.use('/analytics', analyticsRouter)
apiRouter.use('/notifications', notificationRouter)
apiRouter.use('/preferences', preferencesRouter)
apiRouter.use('/push', pushRouter)
// Public (signed-token) one-click unsubscribe from emails.
apiRouter.get('/unsubscribe', unsubscribePage)
apiRouter.post('/unsubscribe', unsubscribe)


