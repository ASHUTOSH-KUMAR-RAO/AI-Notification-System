import { rateLimit } from 'express-rate-limit'
import { sendError } from '../utils/response'

const make = (windowMs: number, limit: number, message: string) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (_req, res) => {
      sendError(res, 429, message)
    },
  })

export const apiLimiter = make(15 * 60 * 1000, 300, 'Too many requests, please try again later')

/** Stricter limit for login/register to slow brute force and signup abuse. */
export const authLimiter = make(15 * 60 * 1000, 10, 'Too many attempts, please try again in 15 minutes')

/** Re-analyze triggers an LLM call: 10 per minute per IP. */
export const aiLimiter = make(60 * 1000, 10, 'Too many AI requests, please slow down')

/** Behaviour events are batched by the client; 60 requests a minute is generous. */
export const eventsLimiter = make(60 * 1000, 60, 'Too many events, slow down')
