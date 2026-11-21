import { randomUUID } from 'node:crypto'
import { db } from '../config/db'
import { log } from '../utils/logger'

const instanceId = randomUUID()

/**
 * Lease-based lock in Postgres: whoever flips the row wins, the lease expires on its own if the holder crashes.
 * (Advisory locks would not survive a pooled/pgbouncer connection, so a table is used instead.)
 */
export async function acquireLock(name: string, leaseSeconds: number): Promise<boolean> {
  const rows = await db.$queryRaw<{ name: string }[]>`
    INSERT INTO "JobLock" ("name", "lockedUntil", "lockedBy")
    VALUES (${name}, NOW() + make_interval(secs => ${leaseSeconds}::float8), ${instanceId})
    ON CONFLICT ("name") DO UPDATE
      SET "lockedUntil" = NOW() + make_interval(secs => ${leaseSeconds}::float8), "lockedBy" = ${instanceId}
      WHERE "JobLock"."lockedUntil" < NOW()
    RETURNING "name"`
  return rows.length > 0
}

export async function releaseLock(name: string) {
  await db.$executeRaw`UPDATE "JobLock" SET "lockedUntil" = NOW() WHERE "name" = ${name} AND "lockedBy" = ${instanceId}`
}

/** Runs `fn` only if this instance wins the lock. Never throws. Returns whether it ran. */
export async function runWithLock(name: string, leaseSeconds: number, fn: () => Promise<unknown>): Promise<boolean> {
  try {
    if (!(await acquireLock(name, leaseSeconds))) return false
  } catch (err) {
    log.error(`[scheduler] could not acquire lock ${name}:`, err instanceof Error ? err.message : err)
    return false
  }
  try {
    await fn()
  } catch (err) {
    log.error(`[scheduler] job ${name} failed:`, err instanceof Error ? err.message : err)
  } finally {
    await releaseLock(name).catch(() => {})
  }
  return true
}
