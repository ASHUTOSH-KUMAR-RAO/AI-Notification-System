import type { RequestHandler } from 'express'
import { getUser, type PublicUser } from '../services/auth.service'
import { AppError } from '../utils/AppError'
import { asyncHandler } from '../utils/asyncHandler'
import { verifyAccessToken } from '../utils/tokens'

declare module 'express-serve-static-core' {
  interface Request {
    user?: PublicUser
  }
}

/** Requires a valid `Authorization: Bearer <accessToken>` and attaches the user to req.user. */
export const protect: RequestHandler = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) throw new AppError('Not authenticated', 401)
  req.user = await getUser(verifyAccessToken(header.slice(7)))
  next()
})
