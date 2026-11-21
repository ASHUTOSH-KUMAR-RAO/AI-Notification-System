import type { CookieOptions, Response } from 'express'
import { env } from '../config/env'
import { REFRESH_TTL_MS } from './tokens'

const COOKIE_NAME = 'refreshToken'
const isProd = env.NODE_ENV === 'production'

// Production: the web app proxies /api/* to this server (Vercel rewrite), so the cookie is first-party and
// SameSite=Lax works. Set COOKIE_SAMESITE=none only if browsers must call this API cross-site directly.
// Development: same-site localhost over plain HTTP, so no Secure flag.
const base: CookieOptions = {
  httpOnly: true,
  secure: isProd || env.COOKIE_SAMESITE === 'none',
  sameSite: isProd ? env.COOKIE_SAMESITE : 'lax',
  path: '/api/auth',
}

export const setRefreshCookie = (res: Response, token: string) =>
  res.cookie(COOKIE_NAME, token, { ...base, maxAge: REFRESH_TTL_MS })

export const clearRefreshCookie = (res: Response) => res.clearCookie(COOKIE_NAME, base)

export const getRefreshCookie = (cookies: Record<string, unknown> | undefined) => {
  const value = cookies?.[COOKIE_NAME]
  return typeof value === 'string' ? value : undefined
}
