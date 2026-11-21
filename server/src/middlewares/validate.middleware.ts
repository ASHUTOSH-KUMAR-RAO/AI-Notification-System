import type { RequestHandler } from 'express'
import type { ZodType } from 'zod'

type Source = 'body' | 'params' | 'query'

/**
 * Validates req[source] and stores the parsed result on req.validated[source].
 * (Express 5 makes req.query read-only, so we never write back to it.)
 */
export const validate =
  (source: Source, schema: ZodType): RequestHandler =>
  (req, _res, next) => {
    req.validated = { ...req.validated, [source]: schema.parse(req[source]) }
    next()
  }

declare module 'express-serve-static-core' {
  interface Request {
    validated?: { body?: unknown; params?: unknown; query?: unknown }
  }
}

/** Body validation that replaces req.body with the parsed value (used by auth routes). */
export const validateBody =
  (schema: ZodType): RequestHandler =>
  (req, _res, next) => {
    req.body = schema.parse(req.body)
    next()
  }
