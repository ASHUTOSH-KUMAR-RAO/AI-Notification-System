import type { ErrorRequestHandler, RequestHandler } from 'express'
import { ZodError } from 'zod'
import { env } from '../config/env'
import { AppError } from '../utils/AppError'
import { sendError } from '../utils/response'
import { log } from '../utils/logger'

export const notFound: RequestHandler = (req, _res, next) => {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404))
}

export const errorHandler: ErrorRequestHandler = (err, _req, res, next) => {
  if (res.headersSent) return next(err)

  if (err instanceof AppError) return sendError(res, err.statusCode, err.message)

  if (err instanceof ZodError) {
    return sendError(res, 400, err.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '))
  }

  // body-parser errors (malformed JSON, payload too large) carry their own status
  if (typeof err?.status === 'number' && err.status >= 400 && err.status < 500) {
    return sendError(res, err.status, err.type === 'entity.parse.failed' ? 'Malformed JSON body' : err.message)
  }

  log.error('unhandled error', err)
  return sendError(res, 500, env.NODE_ENV === 'production' ? 'Internal server error' : String(err?.message ?? err))
}
