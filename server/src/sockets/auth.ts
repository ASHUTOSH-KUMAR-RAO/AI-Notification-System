import type { Socket } from 'socket.io'
import { getUser } from '../services/auth.service'
import { AppError } from '../utils/AppError'
import { verifyAccessToken } from '../utils/tokens'
import { log } from '../utils/logger'

export type SocketAuthCode = 'AUTH_REQUIRED' | 'TOKEN_EXPIRED' | 'TOKEN_INVALID' | 'SERVER_ERROR'

function authError(code: SocketAuthCode, message: string) {
  return Object.assign(new Error(message), { data: { code } })
}

/**
 * Handshake auth: the client sends its access token in `auth.token`.
 * Rejections carry `err.data.code` so the client knows whether to refresh the token (TOKEN_*, AUTH_REQUIRED)
 * or just retry later (SERVER_ERROR).
 */
export async function socketAuth(socket: Socket, next: (err?: Error) => void) {
  const token: unknown = socket.handshake.auth?.token
  if (typeof token !== 'string' || token === '') return next(authError('AUTH_REQUIRED', 'Authentication required'))

  try {
    const user = await getUser(verifyAccessToken(token))
    socket.data.userId = user.id
    next()
  } catch (err) {
    if (err instanceof AppError) return next(authError((err.code as SocketAuthCode) ?? 'TOKEN_INVALID', 'Authentication failed'))
    log.error('[socket] auth lookup failed:', err instanceof Error ? err.message : err)
    next(authError('SERVER_ERROR', 'Temporary server error'))
  }
}
