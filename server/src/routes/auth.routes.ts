import { Router } from 'express'
import * as auth from '../controllers/auth.controller'
import { protect } from '../middlewares/auth.middleware'
import { requireAllowedOrigin } from '../middlewares/origin.middleware'
import { authLimiter } from '../middlewares/rateLimiter'
import { validateBody } from '../middlewares/validate.middleware'
import { loginSchema, registerSchema } from '../validators/auth.validators'

export const authRouter = Router()

authRouter.post('/register', authLimiter, validateBody(registerSchema), auth.register)
authRouter.post('/login', authLimiter, validateBody(loginSchema), auth.login)
authRouter.post('/refresh', requireAllowedOrigin, auth.refresh)
authRouter.post('/logout', requireAllowedOrigin, auth.logout)
authRouter.get('/me', protect, auth.me)
