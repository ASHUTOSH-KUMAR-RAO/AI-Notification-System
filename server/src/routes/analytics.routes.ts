import { Router } from 'express'
import { z } from 'zod'
import * as c from '../controllers/analytics.controller'
import { protect } from '../middlewares/auth.middleware'
import { validate } from '../middlewares/validate.middleware'

export const analyticsRouter = Router()
analyticsRouter.use(protect)
analyticsRouter.get('/overview', validate('query', z.object({ range: z.enum(['7d', '30d', '90d']).default('30d') })), c.overview)
