import type { RequestHandler } from 'express'
import { allowedOrigins } from '../config/env'
import { AppError } from '../utils/AppError'

/**
 * CSRF defence for cookie-authenticated endpoints (refresh/logout): browsers always send Origin on
 * cross-site POSTs, so reject any that is not our frontend. Non-browser clients send no Origin.
 */
export const requireAllowedOrigin: RequestHandler = (req, _res, next) => {
  const origin = req.headers.origin
  if (origin && !allowedOrigins.includes(origin)) return next(new AppError('Origin not allowed', 403))
  next()
}
