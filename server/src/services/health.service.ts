import { db } from '../config/db'
import { withRetry } from '../utils/retry'
import { AppError } from '../utils/AppError'
import { log } from '../utils/logger'

export async function getHealth() {
  try {
    // One cold-start retry: the first connection to the Supabase pooler after a boot can fail.
    await withRetry(() => db.$queryRaw`SELECT 1`, 3, 700)
  } catch (err) {
    log.error('Health check: database unreachable', err)
    throw new AppError('Database connection failed', 503)
  }
  return { status: 'ok', database: 'connected', uptime: process.uptime() }
}
