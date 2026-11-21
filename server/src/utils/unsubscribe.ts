import crypto from 'node:crypto'
import { env, publicApiUrl } from '../config/env'

// Dedicated key derived from the refresh secret so unsubscribe links can't be used as (or forged into) JWTs.
const key = crypto.createHmac('sha256', env.JWT_REFRESH_SECRET).update('unsubscribe-links').digest()

export type UnsubscribeScope = 'digest' | `category:${string}`

const sign = (body: string) => crypto.createHmac('sha256', key).update(body).digest('base64url')

/** Signed, non-expiring token (unsubscribe links must keep working in old emails). */
export function createUnsubscribeToken(userId: string, scope: UnsubscribeScope) {
  const body = Buffer.from(JSON.stringify({ u: userId, s: scope })).toString('base64url')
  return `${body}.${sign(body)}`
}

export function verifyUnsubscribeToken(token: string): { userId: string; scope: UnsubscribeScope } | null {
  const [body, sig] = token.split('.')
  if (!body || !sig) return null
  const expected = Buffer.from(sign(body))
  const given = Buffer.from(sig)
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) return null
  try {
    const { u, s } = JSON.parse(Buffer.from(body, 'base64url').toString())
    return typeof u === 'string' && typeof s === 'string' ? { userId: u, scope: s as UnsubscribeScope } : null
  } catch {
    return null
  }
}

export const unsubscribeUrl = (userId: string, scope: UnsubscribeScope) =>
  `${publicApiUrl}/api/unsubscribe?token=${createUnsubscribeToken(userId, scope)}`
