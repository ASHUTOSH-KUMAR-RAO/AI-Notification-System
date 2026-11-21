import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../generated/prisma/client'
import { withRetry } from '../utils/retry'
import { env } from './env'

const READ_OPS = new Set(['findUnique', 'findUniqueOrThrow', 'findFirst', 'findFirstOrThrow', 'findMany', 'count', 'aggregate', 'groupBy', 'queryRaw', '$queryRaw'])
const msg = (e: unknown) => (e instanceof Error ? e.message : String(e))
// The connection could not even be opened, so nothing reached the database: always safe to retry, reads and writes alike.
const connectFailed = (e: unknown) => /timeout exceeded when trying to connect|Connection terminated due to connection timeout|ECONNREFUSED|ENOTFOUND/i.test(msg(e))
// The connection died around the query: only safe to retry for reads.
const connectionLost = (e: unknown) => /closed the connection|Connection terminated unexpectedly|ECONNRESET/i.test(msg(e))

function createClient() {
  const base = new PrismaClient({
    adapter: new PrismaPg({
      connectionString: env.DATABASE_URL,
      max: env.DB_POOL_MAX,
      // Opening a connection to the pooler is slow and occasionally fails (TLS + distance), so keep warm ones around
      // (1 minute, instead of churning them), keep them alive, and never wait forever for a new one.
      idleTimeoutMillis: 60_000,
      connectionTimeoutMillis: 6_000, // a healthy connect takes 1-3s; fail fast and retry instead of hanging
      keepAlive: true,
    }),
    // Prisma's own error logs embed the failing query; in production errors are logged by our sanitized logger instead.
    log: env.NODE_ENV === 'development' ? ['warn', 'error'] : [],
  })
  // Retries: connects that fail/time out (any operation) and reads that hit a connection the pooler closed.
  // ponytail: a write whose connection dies mid-query is NOT retried (it could be applied twice); add idempotency keys if needed.
  return base.$extends({
    query: {
      $allOperations({ operation, args, query }) {
        const retryable = READ_OPS.has(operation) ? (e: unknown) => connectFailed(e) || connectionLost(e) : connectFailed
        return withRetry(() => query(args), 4, 300, retryable)
      },
    },
  })
}

// Singleton so hot reloads (tsx watch) don't open a new connection pool each time.
const globalForPrisma = globalThis as unknown as { prisma?: ReturnType<typeof createClient> }

export const db = globalForPrisma.prisma ?? createClient()

if (env.NODE_ENV !== 'production') globalForPrisma.prisma = db
