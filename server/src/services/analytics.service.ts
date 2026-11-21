import { db } from '../config/db'
import { notificationEvents } from '../utils/notificationEvents'
import { notificationSelect } from './notification.service'

export const RANGES = { '7d': 7, '30d': 30, '90d': 90 } as const
export type Range = keyof typeof RANGES

const DAY = 86_400_000
const TTL_MS = 30_000
const CATEGORIES = ['SYSTEM', 'ORDER', 'SECURITY', 'SOCIAL', 'PROMOTION', 'REMINDER'] as const
const PRIORITIES = ['HIGH', 'MEDIUM', 'LOW'] as const
const CHANNELS = ['IN_APP', 'EMAIL', 'PUSH'] as const

interface Totals {
  total: number
  unread: number
  read: number
  spam: number
  aiAnalyzed: number
  aiFallback: number
}
type Summary = Totals & { readRate: number; avgTimeToOpenMs: number | null }

export interface Overview {
  range: Range
  generatedAt: string
  current: Summary
  previous: Summary
  overTime: { date: string; HIGH: number; MEDIUM: number; LOW: number }[]
  categories: { category: (typeof CATEGORIES)[number]; count: number }[]
  delivery: { channel: (typeof CHANNELS)[number]; sent: number; failed: number; skipped: number; total: number; successRate: number | null }[]
  engagement: { category: (typeof CATEGORIES)[number]; score: number; samples: number }[]
  recentHigh: Awaited<ReturnType<typeof recentHigh>>
}

// Short per-user cache: the dashboard refetches on every live event, so bursts collapse into one query set.
const cache = new Map<string, { at: number; value: Overview }>()

// Any change to a user's notifications invalidates their cached overview so live updates are never stale.
const bust = (userId: string) => {
  for (const k of cache.keys()) if (k.startsWith(`${userId}:`)) cache.delete(k)
}
for (const e of ['created', 'updated', 'read', 'read-all', 'deleted'] as const) notificationEvents.on(e, (...a: [string, ...unknown[]]) => bust(a[0]))

const rate = (read: number, total: number, spam: number) => (total - spam > 0 ? read / (total - spam) : 0)

/** Totals for [from, to) in one pass, using the (userId, createdAt) index. */
async function totals(userId: string, from: Date, to: Date): Promise<Totals> {
  const [r] = await db.$queryRaw<Totals[]>`
    SELECT COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE NOT "isRead" AND NOT "isSpam")::int AS unread,
      COUNT(*) FILTER (WHERE "isRead")::int AS read,
      COUNT(*) FILTER (WHERE "isSpam")::int AS spam,
      COUNT(*) FILTER (WHERE "aiStatus" = 'DONE')::int AS "aiAnalyzed",
      COUNT(*) FILTER (WHERE "aiStatus" IN ('FALLBACK','FAILED'))::int AS "aiFallback"
    FROM "Notification"
    WHERE "userId" = ${userId}::uuid AND "deletedAt" IS NULL AND "createdAt" >= ${from} AND "createdAt" < ${to}`
  return r
}

async function avgOpen(userId: string, from: Date, to: Date) {
  const [r] = await db.$queryRaw<{ ms: number | null }[]>`
    SELECT AVG("timeToOpenMs")::float8 AS ms FROM "NotificationEvent"
    WHERE "userId" = ${userId}::uuid AND type = 'OPENED' AND "timeToOpenMs" IS NOT NULL
      AND "createdAt" >= ${from} AND "createdAt" < ${to}`
  return r.ms == null ? null : Math.round(r.ms)
}

const recentHigh = (userId: string) =>
  db.notification.findMany({
    where: { userId, deletedAt: null, priority: 'HIGH', isSpam: false },
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: notificationSelect,
  })

export async function getOverview(userId: string, range: Range): Promise<Overview> {
  const key = `${userId}:${range}`
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value

  const days = RANGES[range]
  const now = new Date()
  const from = new Date(now.getTime() - days * DAY)
  const prevFrom = new Date(from.getTime() - days * DAY)
  const tz = (await db.userPreference.findUnique({ where: { userId }, select: { timeZone: true } }))?.timeZone ?? 'UTC'

  const [cur, prev, curOpen, prevOpen, daily, cats, deliveries, scores, high] = await Promise.all([
    totals(userId, from, now),
    totals(userId, prevFrom, from),
    avgOpen(userId, from, now),
    avgOpen(userId, prevFrom, from),
    db.$queryRaw<{ day: string; priority: string; n: number }[]>`
      SELECT to_char(("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE ${tz}, 'YYYY-MM-DD') AS day, priority::text, COUNT(*)::int AS n
      FROM "Notification"
      WHERE "userId" = ${userId}::uuid AND "deletedAt" IS NULL AND "isSpam" = false AND "createdAt" >= ${from}
      GROUP BY 1, 2`,
    db.notification.groupBy({ by: ['category'], where: { userId, deletedAt: null, isSpam: false, createdAt: { gte: from } }, _count: { _all: true } }),
    db.notificationDelivery.groupBy({ by: ['channel', 'status'], where: { userId, createdAt: { gte: from } }, _count: { _all: true } }),
    db.engagementScore.findMany({ where: { userId } }),
    recentHigh(userId),
  ])

  // Fill every day of the window (in the user's zone) so the chart has no gaps.
  const dayFmt = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' })
  const buckets = new Map<string, { date: string; HIGH: number; MEDIUM: number; LOW: number }>()
  for (let i = days - 1; i >= 0; i--) {
    const date = dayFmt.format(new Date(now.getTime() - i * DAY))
    buckets.set(date, { date, HIGH: 0, MEDIUM: 0, LOW: 0 })
  }
  for (const r of daily) {
    const b = buckets.get(r.day)
    if (b && (PRIORITIES as readonly string[]).includes(r.priority)) b[r.priority as (typeof PRIORITIES)[number]] = r.n
  }

  const delivery = CHANNELS.map((channel) => {
    const n = (status: string) => deliveries.find((d) => d.channel === channel && d.status === status)?._count._all ?? 0
    const sent = n('SENT')
    const failed = n('FAILED')
    const skipped = n('SKIPPED')
    const attempted = sent + failed
    return { channel, sent, failed, skipped, total: sent + failed + skipped, successRate: attempted ? sent / attempted : null }
  })

  const value: Overview = {
    range,
    generatedAt: now.toISOString(),
    current: { ...cur, readRate: rate(cur.read, cur.total, cur.spam), avgTimeToOpenMs: curOpen },
    previous: { ...prev, readRate: rate(prev.read, prev.total, prev.spam), avgTimeToOpenMs: prevOpen },
    overTime: [...buckets.values()],
    categories: CATEGORIES.map((category) => ({ category, count: cats.find((c) => c.category === category)?._count._all ?? 0 })),
    delivery,
    engagement: CATEGORIES.map((category) => {
      const s = scores.find((x) => x.category === category)
      return { category, score: s?.score ?? 0, samples: s?.samples ?? 0 }
    }),
    recentHigh: high,
  }
  cache.set(key, { at: Date.now(), value })
  return value
}
