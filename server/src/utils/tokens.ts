import crypto from 'node:crypto'
import jwt from 'jsonwebtoken'
import { env } from '../config/env'
import { AppError } from './AppError'

export const ACCESS_TTL_SECONDS = env.ACCESS_TOKEN_TTL_MINUTES * 60
export const REFRESH_TTL_MS = env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000

export const signAccessToken = (userId: string) =>
  jwt.sign({}, env.JWT_ACCESS_SECRET, { subject: userId, expiresIn: ACCESS_TTL_SECONDS })

// jwtid makes every refresh token unique even if issued in the same second.
export const signRefreshToken = (userId: string) =>
  jwt.sign({}, env.JWT_REFRESH_SECRET, {
    subject: userId,
    expiresIn: Math.floor(REFRESH_TTL_MS / 1000),
    jwtid: crypto.randomUUID(),
  })

function verify(token: string, secret: string): string {
  try {
    const payload = jwt.verify(token, secret, { algorithms: ['HS256'] })
    if (typeof payload === 'string' || !payload.sub) throw new Error('bad payload')
    return payload.sub
  } catch (err) {
    const code = err instanceof jwt.TokenExpiredError ? 'TOKEN_EXPIRED' : 'TOKEN_INVALID'
    throw new AppError('Invalid or expired token', 401, true, code)
  }
}

/** Returns the user id (sub) or throws AppError 401. */
export const verifyAccessToken = (token: string) => verify(token, env.JWT_ACCESS_SECRET)
export const verifyRefreshToken = (token: string) => verify(token, env.JWT_REFRESH_SECRET)

/** Refresh tokens are stored hashed so a DB leak does not expose usable tokens. */
export const hashToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex')

