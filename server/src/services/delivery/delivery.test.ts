import assert from 'node:assert/strict'
import { after, describe, it } from 'node:test'
import { db } from '../../config/db'
import { acquireLock, releaseLock } from '../../scheduler/lock'
import { giveFeedback, recomputeEngagement, recordEvents } from '../engagement.service'
import { notificationSelect, type NotificationDto } from '../notification.service'
import { updatePreferences } from '../preferences.service'
import { runDigestSweep } from './digest.service'
import { attemptDelivery, deliverAfterAnalysis, releaseDueDeliveries, type DeliveryDeps } from './delivery.service'
import { DeliveryError } from './errors'
import type { EmailChannel } from './email.channel'
import type { PushChannel } from './push.channel'

const enabled = !!process.env.TEST_DATABASE_URL
const suite = enabled ? describe : describe.skip

let seq = 0
async function makeUser() {
  return db.user.create({ data: { name: 'Tester', email: `t${Date.now()}-${seq++}@example.com`, password: 'x' } })
}

async function makeNotification(userId: string, over: Record<string, unknown> = {}): Promise<NotificationDto> {
  return db.notification.create({
    data: { userId, title: 'Payment failed', message: 'Your card was declined', category: 'ORDER', priority: 'HIGH', ...over },
    select: notificationSelect,
  })
}

/** Fake channels that record calls and can be scripted to fail. */
function fakes() {
  const state = {
    emailCalls: [] as { to: string; title?: string; total?: number; groups?: unknown[] }[],
    pushCalls: 0,
    emailFail: null as DeliveryError | null,
    pushResult: 'ok' as 'ok' | 'gone' | DeliveryError,
    now: new Date('2026-03-10T14:00:00Z'),
    online: false,
  }
  const email: EmailChannel = {
    configured: true,
    sendNotification: async (to, p) => {
      if (state.emailFail) throw state.emailFail
      state.emailCalls.push({ to, title: p.title })
    },
    sendDigest: async (to, p) => {
      if (state.emailFail) throw state.emailFail
      state.emailCalls.push({ to, total: p.total, groups: p.groups })
    },
  }
  const push: PushChannel = {
    configured: true,
    send: async () => {
      state.pushCalls++
      if (state.pushResult instanceof DeliveryError) throw state.pushResult
      return state.pushResult
    },
  }
  const deps: DeliveryDeps = { email, push, now: () => state.now, isOnline: async () => state.online }
  return { state, deps }
}

const rowsFor = (notificationId: string) => db.notificationDelivery.findMany({ where: { notificationId }, orderBy: { channel: 'asc' } })
const waitFor = async <T>(fn: () => Promise<T | null | false>, ms = 3000): Promise<T> => {
  const t = Date.now()
  while (Date.now() - t < ms) {
    const v = await fn()
    if (v) return v
    await new Promise((r) => setTimeout(r, 25))
  }
  throw new Error('timed out waiting for condition')
}
const emailRow = (id: string) => db.notificationDelivery.findUnique({ where: { notificationId_channel: { notificationId: id, channel: 'EMAIL' } } })

suite('delivery engine (real database, fake Resend/web-push)', () => {
  after(() => db.$disconnect())

  it('HIGH priority sends an instant email once, even if analysis is delivered twice (idempotent)', async () => {
    const u = await makeUser()
    await updatePreferences(u.id, { categories: { ORDER: { channels: { email: true } } } })
    const n = await makeNotification(u.id)
    const { state, deps } = fakes()
    await deliverAfterAnalysis(u.id, n, deps)
    await deliverAfterAnalysis(u.id, n, deps)
    const row = await waitFor(async () => (await emailRow(n.id))?.status === 'SENT' && (await emailRow(n.id)))
    assert.equal(row.attempts, 1)
    assert.equal(state.emailCalls.length, 1)
    assert.equal(state.emailCalls[0].to, u.email)
    assert.equal((await rowsFor(n.id)).filter((r) => r.channel === 'EMAIL').length, 1)
  })

  it('spam, muted categories and unconfigured channels create no deliveries', async () => {
    const u = await makeUser()
    await updatePreferences(u.id, { categories: { ORDER: { channels: { email: true, push: true } }, SOCIAL: { enabled: false, channels: { email: true } } } })
    const { deps } = fakes()
    const spam = await makeNotification(u.id, { isSpam: true })
    const muted = await makeNotification(u.id, { category: 'SOCIAL' })
    await deliverAfterAnalysis(u.id, spam, deps)
    await deliverAfterAnalysis(u.id, muted, deps)
    const off = await makeNotification(u.id)
    await deliverAfterAnalysis(u.id, off, { ...deps, email: { ...deps.email, configured: false }, push: { ...deps.push, configured: false } })
    await new Promise((r) => setTimeout(r, 150))
    assert.equal((await rowsFor(spam.id)).filter((r) => r.channel !== 'IN_APP').length, 0)
    assert.equal((await rowsFor(muted.id)).length, 0)
    assert.equal((await rowsFor(off.id)).filter((r) => r.channel !== 'IN_APP').length, 0)
  })

  it('transient email failure: retries with backoff, then succeeds', async () => {
    const u = await makeUser()
    await updatePreferences(u.id, { categories: { ORDER: { channels: { email: true } } } })
    const n = await makeNotification(u.id)
    const { state, deps } = fakes()
    state.emailFail = new DeliveryError('Resend: 503', true)
    await deliverAfterAnalysis(u.id, n, deps)
    const failed = await waitFor(async () => (await emailRow(n.id))?.attempts === 1 && (await emailRow(n.id)))
    assert.equal(failed.status, 'PENDING')
    assert.equal(failed.nextAttemptAt!.getTime(), state.now.getTime() + 60_000) // first backoff step
    await releaseDueDeliveries(deps) // not due yet (counts are global, so assert on this notification's row)
    assert.equal((await emailRow(n.id))!.status, 'PENDING')
    state.now = new Date(state.now.getTime() + 61_000)
    state.emailFail = null
    assert.ok((await releaseDueDeliveries(deps)) >= 1)
    assert.equal((await emailRow(n.id))!.status, 'SENT')
    assert.equal(state.emailCalls.length, 1)
  })

  it('permanent email failure (e.g. rejected address) is not retried', async () => {
    const u = await makeUser()
    await updatePreferences(u.id, { categories: { ORDER: { channels: { email: true } } } })
    const n = await makeNotification(u.id)
    const { state, deps } = fakes()
    state.emailFail = new DeliveryError('Resend: invalid address', false)
    await deliverAfterAnalysis(u.id, n, deps)
    const row = await waitFor(async () => (await emailRow(n.id))?.status === 'FAILED' && (await emailRow(n.id)))
    assert.equal(row.nextAttemptAt, null)
    state.now = new Date(state.now.getTime() + 3_600_000)
    assert.equal(await releaseDueDeliveries(deps), 0)
  })

  it('gives up after MAX_ATTEMPTS transient failures; the notification itself is untouched', async () => {
    const u = await makeUser()
    await updatePreferences(u.id, { categories: { ORDER: { channels: { email: true } } } })
    const n = await makeNotification(u.id)
    const { state, deps } = fakes()
    state.emailFail = new DeliveryError('Resend: 500', true)
    await deliverAfterAnalysis(u.id, n, deps)
    await waitFor(async () => (await emailRow(n.id))?.attempts === 1)
    for (let i = 0; i < 3; i++) {
      state.now = new Date(state.now.getTime() + 16 * 60_000)
      await releaseDueDeliveries(deps)
    }
    const row = (await emailRow(n.id))!
    assert.equal(row.status, 'FAILED')
    assert.equal(row.attempts, 4)
    const stillThere = await db.notification.findUnique({ where: { id: n.id } })
    assert.equal(stillThere?.deletedAt, null)
  })

  it('quiet hours: push is HELD, then released when quiet hours end', async () => {
    const u = await makeUser()
    await updatePreferences(u.id, { quietHoursEnabled: true, quietStart: '13:00', quietEnd: '16:00', timeZone: 'UTC', quietAllowHigh: false, categories: { ORDER: { channels: { push: true } } } })
    await db.pushSubscription.create({ data: { userId: u.id, endpoint: `https://push.example/${u.id}`, p256dh: 'k', auth: 'a' } })
    const n = await makeNotification(u.id)
    const { state, deps } = fakes()
    await deliverAfterAnalysis(u.id, n, deps)
    const held = (await rowsFor(n.id)).find((r) => r.channel === 'PUSH')!
    assert.equal(held.status, 'HELD')
    assert.equal(held.nextAttemptAt!.toISOString(), '2026-03-10T16:00:00.000Z')
    assert.equal(state.pushCalls, 0)

    state.now = new Date('2026-03-10T15:30:00Z')
    assert.equal(await releaseDueDeliveries(deps), 0)
    state.now = new Date('2026-03-10T16:01:00Z')
    assert.equal(await releaseDueDeliveries(deps), 1)
    assert.equal(state.pushCalls, 1)
    assert.equal((await rowsFor(n.id)).find((r) => r.channel === 'PUSH')!.status, 'SENT')
  })

  it('held notifications already read by release time are not sent', async () => {
    const u = await makeUser()
    await updatePreferences(u.id, { quietHoursEnabled: true, quietStart: '13:00', quietEnd: '16:00', timeZone: 'UTC', quietAllowHigh: false, categories: { ORDER: { channels: { email: true } } } })
    const n = await makeNotification(u.id)
    const { state, deps } = fakes()
    await deliverAfterAnalysis(u.id, n, deps)
    assert.equal((await emailRow(n.id))!.status, 'HELD')
    await db.notification.update({ where: { id: n.id }, data: { isRead: true } })
    state.now = new Date('2026-03-10T16:05:00Z')
    await releaseDueDeliveries(deps)
    const row = (await emailRow(n.id))!
    assert.equal(row.status, 'SKIPPED')
    assert.equal(row.error, 'already read')
    assert.equal(state.emailCalls.length, 0)
  })

  it('HIGH override: sends immediately during quiet hours when allowed', async () => {
    const u = await makeUser()
    await updatePreferences(u.id, { quietHoursEnabled: true, quietStart: '13:00', quietEnd: '16:00', timeZone: 'UTC', quietAllowHigh: true, categories: { ORDER: { channels: { email: true } } } })
    const n = await makeNotification(u.id)
    const { state, deps } = fakes()
    await deliverAfterAnalysis(u.id, n, deps)
    await waitFor(async () => (await emailRow(n.id))?.status === 'SENT')
    assert.equal(state.emailCalls.length, 1)
  })

  it('push: an expired subscription (410) is removed automatically; transient errors retry', async () => {
    const u = await makeUser()
    await updatePreferences(u.id, { categories: { ORDER: { channels: { push: true } } } })
    const sub = await db.pushSubscription.create({ data: { userId: u.id, endpoint: `https://push.example/gone-${u.id}`, p256dh: 'k', auth: 'a' } })
    const n = await makeNotification(u.id)
    const { state, deps } = fakes()
    state.pushResult = 'gone'
    await deliverAfterAnalysis(u.id, n, deps)
    await waitFor(async () => (await db.pushSubscription.findUnique({ where: { id: sub.id } })) === null)
    const row = await waitFor(async () => { const r = (await rowsFor(n.id)).find((x) => x.channel === 'PUSH'); return r?.status === 'SKIPPED' && r })
    assert.equal(row.error, 'subscription expired')

    const u2 = await makeUser()
    await updatePreferences(u2.id, { categories: { ORDER: { channels: { push: true } } } })
    await db.pushSubscription.create({ data: { userId: u2.id, endpoint: `https://push.example/flaky-${u2.id}`, p256dh: 'k', auth: 'a' } })
    const n2 = await makeNotification(u2.id)
    state.pushResult = new DeliveryError('Push failed (503)', true)
    await deliverAfterAnalysis(u2.id, n2, deps)
    const r2 = await waitFor(async () => { const r = (await rowsFor(n2.id)).find((x) => x.channel === 'PUSH'); return r?.attempts === 1 && r })
    assert.equal(r2.status, 'PENDING')
  })

  it('push is skipped while the user has a tab open', async () => {
    const u = await makeUser()
    await updatePreferences(u.id, { categories: { ORDER: { channels: { push: true } } } })
    await db.pushSubscription.create({ data: { userId: u.id, endpoint: `https://push.example/online-${u.id}`, p256dh: 'k', auth: 'a' } })
    const n = await makeNotification(u.id)
    const { state, deps } = fakes()
    state.online = true
    await deliverAfterAnalysis(u.id, n, deps)
    await new Promise((r) => setTimeout(r, 150))
    assert.equal(state.pushCalls, 0)
  })

  it('claiming makes concurrent attempts send exactly once', async () => {
    const u = await makeUser()
    await updatePreferences(u.id, { categories: { ORDER: { channels: { email: true } } } })
    const n = await makeNotification(u.id)
    const { state, deps } = fakes()
    await deliverAfterAnalysis(u.id, n, deps)
    const row = (await emailRow(n.id))!
    await Promise.all([attemptDelivery(row.id, deps), attemptDelivery(row.id, deps), attemptDelivery(row.id, deps)])
    assert.equal(state.emailCalls.length, 1)
  })
})

suite('daily digest (idempotency)', () => {
  const setup = async (over: Parameters<typeof updatePreferences>[1] = {}) => {
    const u = await makeUser()
    await updatePreferences(u.id, { digestEnabled: true, digestTime: '08:00', timeZone: 'UTC', ...over })
    return u
  }
  const at = (iso: string) => new Date(iso)

  it('sends one grouped digest per local day, no matter how often the sweep runs', async () => {
    const u = await setup()
    const { state, deps } = fakes()
    state.now = at('2026-03-10T09:00:00Z')
    const g = 'group-1'
    await makeNotification(u.id, { priority: 'MEDIUM', category: 'ORDER', title: 'Order shipped', isRead: false, groupKey: g, createdAt: at('2026-03-10T05:00:00Z') })
    await makeNotification(u.id, { priority: 'MEDIUM', category: 'ORDER', title: 'Order delivered', isRead: false, groupKey: g, createdAt: at('2026-03-10T06:00:00Z') })
    await makeNotification(u.id, { priority: 'LOW', category: 'PROMOTION', title: 'Weekend sale', isRead: false, createdAt: at('2026-03-10T07:00:00Z') })
    await makeNotification(u.id, { priority: 'HIGH', title: 'Urgent (emailed instantly, not in digest)', createdAt: at('2026-03-10T07:00:00Z') })
    await makeNotification(u.id, { priority: 'LOW', title: 'Already read', isRead: true, createdAt: at('2026-03-10T07:00:00Z') })
    await makeNotification(u.id, { priority: 'LOW', title: 'Spam', isSpam: true, createdAt: at('2026-03-10T07:00:00Z') })

    await runDigestSweep(deps)
    await runDigestSweep(deps)
    await Promise.all([runDigestSweep(deps), runDigestSweep(deps)]) // concurrent sweeps (e.g. two instances)
    state.now = at('2026-03-10T23:00:00Z')
    await runDigestSweep(deps)

    const mine = state.emailCalls.filter((c) => c.to === u.email)
    assert.equal(mine.length, 1, 'exactly one digest email')
    assert.equal(mine[0].total, 3)
    assert.equal(mine[0].groups!.length, 2) // the two order updates form one group + the sale
    assert.equal(await db.digestRun.count({ where: { userId: u.id } }), 1)
  })

  it('does not send before the digest time, and sends the next local day', async () => {
    const u = await setup()
    const { state, deps } = fakes()
    await makeNotification(u.id, { priority: 'LOW', isRead: false, title: 'Newsletter', createdAt: at('2026-03-10T05:00:00Z') })
    state.now = at('2026-03-10T07:30:00Z')
    await runDigestSweep(deps)
    assert.equal(state.emailCalls.filter((c) => c.to === u.email).length, 0)
    state.now = at('2026-03-10T08:00:30Z')
    await runDigestSweep(deps)
    assert.equal(state.emailCalls.filter((c) => c.to === u.email).length, 1)

    await makeNotification(u.id, { priority: 'LOW', isRead: false, title: 'Tomorrow news', createdAt: at('2026-03-11T02:00:00Z') })
    state.now = at('2026-03-11T08:01:00Z')
    await runDigestSweep(deps)
    assert.equal(state.emailCalls.filter((c) => c.to === u.email).length, 2)
    assert.equal(await db.digestRun.count({ where: { userId: u.id } }), 2)
  })

  it("uses the user's time zone for 'today' and the send time", async () => {
    const u = await setup({ timeZone: 'Asia/Kolkata', digestTime: '08:00' }) // 08:00 IST = 02:30Z
    const { state, deps } = fakes()
    await makeNotification(u.id, { priority: 'LOW', isRead: false, title: 'Hello', createdAt: at('2026-03-10T01:00:00Z') })
    state.now = at('2026-03-10T02:00:00Z') // 07:30 IST: too early
    await runDigestSweep(deps)
    assert.equal(state.emailCalls.filter((c) => c.to === u.email).length, 0)
    state.now = at('2026-03-10T02:31:00Z') // 08:01 IST
    await runDigestSweep(deps)
    assert.equal(state.emailCalls.filter((c) => c.to === u.email).length, 1)
    assert.equal((await db.digestRun.findFirst({ where: { userId: u.id } }))!.localDate, '2026-03-10')
  })

  it('sends nothing (but records the day) when there is nothing unread; skips users with digest off', async () => {
    const u = await setup()
    const off = await setup({ digestEnabled: false })
    await makeNotification(off.id, { priority: 'LOW', isRead: false })
    const { state, deps } = fakes()
    state.now = at('2026-03-10T09:00:00Z')
    await runDigestSweep(deps)
    assert.equal(state.emailCalls.filter((c) => c.to === u.email || c.to === off.email).length, 0)
    assert.equal((await db.digestRun.findFirst({ where: { userId: u.id } }))!.itemCount, 0)
    assert.equal(await db.digestRun.count({ where: { userId: off.id } }), 0)
  })

  it('email failure: the run is retried later (not duplicated) and eventually sends', async () => {
    const u = await setup()
    const { state, deps } = fakes()
    state.now = at('2026-03-10T09:00:00Z')
    await makeNotification(u.id, { priority: 'LOW', isRead: false, title: 'News', createdAt: at('2026-03-10T05:00:00Z') })
    state.emailFail = new DeliveryError('Resend: 503', true)
    await runDigestSweep(deps)
    assert.equal((await db.digestRun.findFirst({ where: { userId: u.id } }))!.status, 'FAILED')
    state.emailFail = null
    await runDigestSweep(deps) // too soon: backoff not elapsed
    assert.equal(state.emailCalls.filter((c) => c.to === u.email).length, 0)
    state.now = at('2026-03-10T09:06:00Z')
    await runDigestSweep(deps)
    assert.equal(state.emailCalls.filter((c) => c.to === u.email).length, 1)
    assert.equal(await db.digestRun.count({ where: { userId: u.id } }), 1)
    assert.equal((await db.digestRun.findFirst({ where: { userId: u.id } }))!.status, 'SENT')
  })

  it('does nothing when email is not configured', async () => {
    const u = await setup()
    await makeNotification(u.id, { priority: 'LOW', isRead: false })
    const { state, deps } = fakes()
    state.now = at('2026-03-10T09:00:00Z')
    await runDigestSweep({ ...deps, email: { ...deps.email, configured: false } })
    assert.equal(await db.digestRun.count({ where: { userId: u.id } }), 0)
  })
})

suite('job lock', () => {
  it('only one holder at a time; expires on its own; can be released', async () => {
    const name = `test-${Date.now()}`
    assert.equal(await acquireLock(name, 60), true)
    assert.equal(await acquireLock(name, 60), false) // held
    await db.$executeRaw`UPDATE "JobLock" SET "lockedUntil" = NOW() - interval '1 second' WHERE "name" = ${name}`
    assert.equal(await acquireLock(name, 60), true) // lease expired (simulated crash)
    await releaseLock(name)
    assert.equal(await acquireLock(name, 60), true) // released
    await releaseLock(name)
  })
})

suite('behaviour tracking, engagement and feedback', () => {
  it('records at most one event per type, measures time-to-open, ignores notifications you do not own', async () => {
    const u = await makeUser()
    const other = await makeUser()
    const n = await makeNotification(u.id, { createdAt: new Date(Date.now() - 120_000) })
    const foreign = await makeNotification(other.id)
    const r1 = await recordEvents(u.id, [{ notificationId: n.id, type: 'OPENED' }, { notificationId: n.id, type: 'OPENED' }, { notificationId: foreign.id, type: 'OPENED' }])
    assert.equal(r1.recorded, 1)
    assert.equal((await recordEvents(u.id, [{ notificationId: n.id, type: 'OPENED' }])).recorded, 0)
    const ev = await db.notificationEvent.findFirst({ where: { notificationId: n.id } })
    assert.ok(ev!.timeToOpenMs! >= 119_000 && ev!.timeToOpenMs! < 130_000)
    assert.equal(await db.notificationEvent.count({ where: { notificationId: foreign.id } }), 0)
  })

  it('engagement score rises for fast openers and falls for dismissers; stays neutral-ish with little data', async () => {
    const fast = await makeUser()
    const ignorer = await makeUser()
    for (let i = 0; i < 8; i++) {
      const a = await makeNotification(fast.id, { createdAt: new Date(Date.now() - 60_000) })
      await recordEvents(fast.id, [{ notificationId: a.id, type: 'OPENED' }, { notificationId: a.id, type: 'CLICKED' }])
      const b = await makeNotification(ignorer.id, { deletedAt: new Date() })
      await recordEvents(ignorer.id, [{ notificationId: b.id, type: 'DISMISSED' }])
    }
    await recomputeEngagement(fast.id, 'ORDER')
    await recomputeEngagement(ignorer.id, 'ORDER')
    const f = await db.engagementScore.findUniqueOrThrow({ where: { userId_category: { userId: fast.id, category: 'ORDER' } } })
    const g = await db.engagementScore.findUniqueOrThrow({ where: { userId_category: { userId: ignorer.id, category: 'ORDER' } } })
    assert.ok(f.score > 0.65, `fast=${f.score}`)
    assert.ok(g.score < 0.2, `ignorer=${g.score}`)
    assert.equal(f.samples, 8)
  })

  it('feedback re-personalizes at once, is reversible, and never changes a user-set priority', async () => {
    const u = await makeUser()
    const n = await makeNotification(u.id, { priority: 'MEDIUM', aiPriority: 'MEDIUM' })
    const up = await giveFeedback(u.id, n.id, 'IMPORTANT')
    assert.equal(up.priority, 'HIGH')
    assert.equal(up.personalizationReason, 'You marked this as important')
    assert.equal(up.feedback, 'IMPORTANT')
    const down = await giveFeedback(u.id, n.id, 'NOT_IMPORTANT')
    assert.equal(down.priority, 'LOW') // baseline stays the AI priority, so toggling does not compound
    const cleared = await giveFeedback(u.id, n.id, null)
    assert.equal(cleared.priority, 'MEDIUM')
    assert.equal(cleared.personalizationReason, null)

    const mine = await makeNotification(u.id, { priority: 'LOW', prioritySetByUser: true })
    assert.equal((await giveFeedback(u.id, mine.id, 'IMPORTANT')).priority, 'LOW')

    const stranger = await makeUser()
    await assert.rejects(() => giveFeedback(stranger.id, n.id, 'IMPORTANT'), /not found/i)
  })
})
