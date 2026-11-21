import bcrypt from 'bcryptjs'
import { db } from '../config/db'
import { Prisma } from '../generated/prisma/client'
import type { LoginInput, RegisterInput } from '../validators/auth.validators'
import { AppError } from '../utils/AppError'
import {
  hashToken,
  REFRESH_TTL_MS,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../utils/tokens'

const BCRYPT_COST = 12
// Compared against when the email is unknown so login timing does not reveal which emails exist.
const DUMMY_HASH = bcrypt.hashSync('dummy-password', BCRYPT_COST)

export const publicUserSelect = { id: true, name: true, email: true, createdAt: true } as const
export type PublicUser = Prisma.UserGetPayload<{ select: typeof publicUserSelect }>

async function issueTokens(userId: string) {
  const refreshToken = signRefreshToken(userId)
  await db.refreshToken.create({
    data: { tokenHash: hashToken(refreshToken), userId, expiresAt: new Date(Date.now() + REFRESH_TTL_MS) },
  })
  return { accessToken: signAccessToken(userId), refreshToken }
}

export async function register({ name, email, password }: RegisterInput) {
  const hashed = await bcrypt.hash(password, BCRYPT_COST)
  let user: PublicUser
  try {
    user = await db.user.create({ data: { name, email, password: hashed }, select: publicUserSelect })
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw new AppError('An account with this email already exists', 409)
    }
    throw err
  }
  return { user, ...(await issueTokens(user.id)) }
}

export async function login({ email, password }: LoginInput) {
  const found = await db.user.findUnique({ where: { email } })
  const ok = await bcrypt.compare(password, found?.password ?? DUMMY_HASH)
  if (!found || !ok) throw new AppError('Invalid email or password', 401)

  // Opportunistic cleanup of this user's expired refresh tokens.
  await db.refreshToken.deleteMany({ where: { userId: found.id, expiresAt: { lt: new Date() } } })

  const { password: _pw, updatedAt: _u, ...user } = found
  return { user, ...(await issueTokens(found.id)) }
}

/** Rotates the refresh token: the presented one is consumed (single use) and a new pair is issued. */
export async function refresh(presented: string | undefined) {
  if (!presented) throw new AppError('Not authenticated', 401)
  const userId = verifyRefreshToken(presented)

  // deleteMany is atomic: only one concurrent request can consume a given token.
  const consumed = await db.refreshToken.deleteMany({
    where: { tokenHash: hashToken(presented), userId, expiresAt: { gt: new Date() } },
  })
  if (consumed.count === 0) throw new AppError('Invalid or expired token', 401)

  return issueTokens(userId)
}

export async function logout(presented: string | undefined) {
  if (!presented) return
  await db.refreshToken.deleteMany({ where: { tokenHash: hashToken(presented) } })
}

export async function getUser(id: string) {
  const user = await db.user.findUnique({ where: { id }, select: publicUserSelect })
  if (!user) throw new AppError('Not authenticated', 401)
  return user
}
