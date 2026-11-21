import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { generateVAPIDKeys } from 'web-push'
import { createUnsubscribeToken, verifyUnsubscribeToken } from '../utils/unsubscribe'
import { isValidTimeZone, localParts, nextLocalTime, zonedTimeToUtc } from '../utils/time'
import { updatePreferencesSchema } from '../validators/preferences.validators'
import { decideChannels } from './delivery/decide'
import { DeliveryError } from './delivery/errors'
import { createWebPushChannel } from './delivery/push.channel'
import { computeEngagementScore, personalizePriority } from './personalize'
import { defaultPreferences, isQuietNow, mergePreferences, quietEndsAt, type Preferences } from './preferences.logic'

const utc = (s: string) => new Date(s)

describe('time zones', () => {
  it('validates IANA names', () => {
    assert.equal(isValidTimeZone('Asia/Kolkata'), true)
    assert.equal(isValidTimeZone('Mars/Olympus'), false)
  })
  it('converts to local parts, including half-hour offsets', () => {
    const p = localParts(utc('2026-03-10T20:30:00Z'), 'Asia/Kolkata') // UTC+5:30
    assert.deepEqual([p.date, p.hour, p.minute], ['2026-03-11', 2, 0])
  })
  it('wall time -> UTC across DST (New York: EST in winter, EDT in summer)', () => {
    assert.equal(zonedTimeToUtc(2026, 1, 15, 7, 0, 'America/New_York').toISOString(), '2026-01-15T12:00:00.000Z')
    assert.equal(zonedTimeToUtc(2026, 7, 15, 7, 0, 'America/New_York').toISOString(), '2026-07-15T11:00:00.000Z')
  })
  it('next local time rolls over midnight and across the spring-forward change', () => {
    // 2026-03-08 02:00 NY clocks jump to 03:00. From Mar 7 23:00 EST, the next 07:00 is Mar 8 07:00 EDT = 11:00Z.
    assert.equal(nextLocalTime(utc('2026-03-08T04:00:00Z'), '07:00', 'America/New_York').toISOString(), '2026-03-08T11:00:00.000Z')
    // Just after 07:00 local -> tomorrow
    assert.equal(nextLocalTime(utc('2026-01-15T12:00:01Z'), '07:00', 'America/New_York').toISOString(), '2026-01-16T12:00:00.000Z')
  })
})

describe('quiet hours', () => {
  const q = (over: Partial<Preferences> = {}): Preferences => ({
    ...defaultPreferences(),
    quietHoursEnabled: true,
    quietStart: '22:00',
    quietEnd: '07:00',
    timeZone: 'Asia/Kolkata',
    ...over,
  })
  it('is off unless enabled', () => assert.equal(isQuietNow(q({ quietHoursEnabled: false }), utc('2026-03-10T20:00:00Z')), false))
  it('wraps midnight in the USER time zone, not the server zone', () => {
    // 20:00Z = 01:30 IST -> inside 22:00-07:00
    assert.equal(isQuietNow(q(), utc('2026-03-10T20:00:00Z')), true)
    // 08:00Z = 13:30 IST -> outside
    assert.equal(isQuietNow(q(), utc('2026-03-10T08:00:00Z')), false)
    // same instant, other zone: 20:00Z is 15:00 in New York -> outside
    assert.equal(isQuietNow(q({ timeZone: 'America/New_York' }), utc('2026-03-10T20:00:00Z')), false)
  })
  it('handles a same-day window and an empty window', () => {
    assert.equal(isQuietNow(q({ quietStart: '13:00', quietEnd: '15:00', timeZone: 'UTC' }), utc('2026-03-10T14:00:00Z')), true)
    assert.equal(isQuietNow(q({ quietStart: '13:00', quietEnd: '13:00', timeZone: 'UTC' }), utc('2026-03-10T13:00:00Z')), false)
  })
  it('end boundary is exclusive; release time is the next quiet end', () => {
    assert.equal(isQuietNow(q({ timeZone: 'UTC' }), utc('2026-03-10T07:00:00Z')), false)
    assert.equal(quietEndsAt(q(), utc('2026-03-10T20:00:00Z')).toISOString(), '2026-03-11T01:30:00.000Z') // 07:00 IST
  })
})

describe('preferences merge + validation', () => {
  it('defaults are opt-in: in-app on, email/push off', () => {
    const d = defaultPreferences()
    assert.equal(d.categories.ORDER.channels.inApp, true)
    assert.equal(d.categories.ORDER.channels.email, false)
    assert.equal(d.categories.ORDER.channels.push, false)
  })
  it('merges per category/channel without touching the rest', () => {
    const m = mergePreferences(defaultPreferences(), { categories: { ORDER: { channels: { email: true } }, SOCIAL: { enabled: false } }, quietStart: '23:00' })
    assert.equal(m.categories.ORDER.channels.email, true)
    assert.equal(m.categories.ORDER.channels.inApp, true)
    assert.equal(m.categories.SOCIAL.enabled, false)
    assert.equal(m.categories.SYSTEM.enabled, true)
    assert.equal(m.quietStart, '23:00')
    assert.equal(m.quietEnd, '07:00')
  })
  it('does not mutate its input and ignores undefined fields', () => {
    const base = defaultPreferences()
    const m = mergePreferences(base, { digestTime: undefined, digestEnabled: true })
    assert.equal(base.digestEnabled, false)
    assert.equal(m.digestTime, '08:00')
  })
  it('zod rejects bad times, zones, unknown keys and empty bodies', () => {
    assert.equal(updatePreferencesSchema.safeParse({ quietStart: '25:00' }).success, false)
    assert.equal(updatePreferencesSchema.safeParse({ quietStart: '9:00' }).success, false)
    assert.equal(updatePreferencesSchema.safeParse({ timeZone: 'Nope/Zone' }).success, false)
    assert.equal(updatePreferencesSchema.safeParse({ hacker: true }).success, false)
    assert.equal(updatePreferencesSchema.safeParse({}).success, false)
    assert.equal(updatePreferencesSchema.safeParse({ categories: { NOPE: { enabled: true } } }).success, false)
    assert.equal(updatePreferencesSchema.safeParse({ quietStart: '22:30', timeZone: 'Asia/Kolkata', categories: { ORDER: { channels: { push: true } } } }).success, true)
  })
})

describe('channel decision', () => {
  const now = utc('2026-03-10T14:00:00Z')
  const prefs = (over: Partial<Preferences> = {}, cat: Partial<Preferences['categories']['ORDER']['channels']> = {}) => {
    const p = mergePreferences(defaultPreferences(), { categories: { ORDER: { channels: { email: true, push: true, ...cat } } }, ...over })
    return p
  }
  const order = (priority: 'HIGH' | 'MEDIUM' | 'LOW', isSpam = false) => ({ category: 'ORDER' as const, priority, isSpam })

  it('spam never uses any channel', () => {
    const d = decideChannels({ prefs: prefs(), notification: order('HIGH', true), now })
    assert.deepEqual([d.inApp, d.email, d.push], ['SKIP', 'SKIP', 'SKIP'])
  })
  it('muted category is silent', () => {
    const p = mergePreferences(prefs(), { categories: { ORDER: { enabled: false } } })
    assert.deepEqual(Object.values(decideChannels({ prefs: p, notification: order('HIGH'), now })).slice(0, 3), ['SKIP', 'SKIP', 'SKIP'])
  })
  it('HIGH gets instant email + push + toast', () => {
    const d = decideChannels({ prefs: prefs(), notification: order('HIGH'), now })
    assert.deepEqual([d.inApp, d.email, d.push], ['SEND', 'SEND', 'SEND'])
  })
  it('email is HIGH-only (the rest goes to the digest)', () => {
    const d = decideChannels({ prefs: prefs(), notification: order('MEDIUM'), now })
    assert.equal(d.email, 'SKIP')
    assert.equal(d.push, 'SEND')
  })
  it('minimum priority gates toast and push', () => {
    const d = decideChannels({ prefs: prefs({ minAlertPriority: 'HIGH' }), notification: order('MEDIUM'), now })
    assert.deepEqual([d.inApp, d.push], ['SKIP', 'SKIP'])
    assert.ok(d.reasons.includes('below minimum priority'))
  })
  it('channel checkboxes are respected', () => {
    const d = decideChannels({ prefs: prefs({}, { email: false, push: false }), notification: order('HIGH'), now })
    assert.deepEqual([d.email, d.push], ['SKIP', 'SKIP'])
  })
  const quiet = { quietHoursEnabled: true, quietStart: '13:00', quietEnd: '16:00', timeZone: 'UTC' } as const
  it('quiet hours: toast skipped, email/push HELD', () => {
    const d = decideChannels({ prefs: prefs({ ...quiet, quietAllowHigh: false }), notification: order('HIGH'), now })
    assert.deepEqual([d.inApp, d.email, d.push], ['SKIP', 'HOLD', 'HOLD'])
  })
  it('quiet hours: HIGH override sends immediately; MEDIUM is still held', () => {
    const high = decideChannels({ prefs: prefs({ ...quiet, quietAllowHigh: true }), notification: order('HIGH'), now })
    assert.deepEqual([high.inApp, high.email, high.push], ['SEND', 'SEND', 'SEND'])
    const med = decideChannels({ prefs: prefs({ ...quiet, quietAllowHigh: true }), notification: order('MEDIUM'), now })
    assert.deepEqual([med.inApp, med.push], ['SKIP', 'HOLD'])
  })
  it('push is skipped while the user has a tab open', () => {
    const d = decideChannels({ prefs: prefs(), notification: order('HIGH'), now, userOnline: true })
    assert.equal(d.push, 'SKIP')
    assert.equal(d.inApp, 'SEND')
  })
})

describe('personalized priority', () => {
  const base = { basePriority: 'MEDIUM' as const, category: 'ORDER' as const, userSet: false, engagement: null, categoryFeedback: { important: 0, notImportant: 0 }, itemFeedback: null }
  it('user-set priority always wins', () => {
    const r = personalizePriority({ ...base, userSet: true, basePriority: 'LOW', engagement: { score: 0.95, samples: 50 }, itemFeedback: 'IMPORTANT' })
    assert.deepEqual(r, { priority: 'LOW', reason: null })
  })
  it('high engagement with enough samples raises by one level with an explanation', () => {
    const r = personalizePriority({ ...base, engagement: { score: 0.8, samples: 10 } })
    assert.equal(r.priority, 'HIGH')
    assert.equal(r.reason, 'You usually open order updates quickly')
  })
  it('ignores engagement with too few samples', () => {
    assert.equal(personalizePriority({ ...base, engagement: { score: 0.99, samples: 2 } }).priority, 'MEDIUM')
  })
  it('low engagement lowers by one level, never below LOW or above HIGH', () => {
    assert.equal(personalizePriority({ ...base, engagement: { score: 0.05, samples: 10 } }).priority, 'LOW')
    assert.equal(personalizePriority({ ...base, basePriority: 'LOW', engagement: { score: 0.05, samples: 10 } }).priority, 'LOW')
    assert.equal(personalizePriority({ ...base, basePriority: 'HIGH', engagement: { score: 0.9, samples: 10 } }).priority, 'HIGH')
  })
  it('category feedback shifts priority once net >= 2', () => {
    assert.equal(personalizePriority({ ...base, categoryFeedback: { important: 3, notImportant: 1 } }).priority, 'HIGH')
    assert.equal(personalizePriority({ ...base, categoryFeedback: { important: 1, notImportant: 0 } }).priority, 'MEDIUM')
    const down = personalizePriority({ ...base, categoryFeedback: { important: 0, notImportant: 3 } })
    assert.equal(down.priority, 'LOW')
    assert.match(down.reason!, /not important/)
  })
  it('opposing signals cancel out', () => {
    assert.equal(personalizePriority({ ...base, engagement: { score: 0.9, samples: 10 }, categoryFeedback: { important: 0, notImportant: 3 } }).priority, 'MEDIUM')
  })
  it('feedback on this notification beats learned behaviour', () => {
    const r = personalizePriority({ ...base, engagement: { score: 0.9, samples: 10 }, itemFeedback: 'NOT_IMPORTANT' })
    assert.equal(r.priority, 'LOW')
    assert.equal(r.reason, 'You marked this as not important')
  })
  it('learned behaviour never demotes a security alert, explicit feedback can', () => {
    const sec = { ...base, category: 'SECURITY' as const, basePriority: 'HIGH' as const, engagement: { score: 0.01, samples: 20 } }
    assert.equal(personalizePriority(sec).priority, 'HIGH')
    assert.equal(personalizePriority({ ...sec, itemFeedback: 'NOT_IMPORTANT' }).priority, 'MEDIUM')
  })
  it('engagement score rewards fast opens and penalises ignoring', () => {
    const good = computeEngagementScore({ total: 10, opened: 9, clicked: 5, dismissedUnopened: 0, medianOpenMs: 60_000 })
    const bad = computeEngagementScore({ total: 10, opened: 1, clicked: 0, dismissedUnopened: 8, medianOpenMs: 20 * 3_600_000 })
    assert.ok(good > 0.65 && bad < 0.2, `good=${good} bad=${bad}`)
    assert.equal(computeEngagementScore({ total: 0, opened: 0, clicked: 0, dismissedUnopened: 0, medianOpenMs: null }), 0.5)
  })
})

describe('unsubscribe tokens', () => {
  it('round-trips and rejects tampering', () => {
    const t = createUnsubscribeToken('user-1', 'category:ORDER')
    assert.deepEqual(verifyUnsubscribeToken(t), { userId: 'user-1', scope: 'category:ORDER' })
    const [body, sig] = t.split('.')
    const forged = Buffer.from(JSON.stringify({ u: 'user-2', s: 'digest' })).toString('base64url')
    assert.equal(verifyUnsubscribeToken(`${forged}.${sig}`), null)
    assert.equal(verifyUnsubscribeToken(`${body}.AAAA`), null)
    assert.equal(verifyUnsubscribeToken('garbage'), null)
  })
})

describe('web-push channel (real library, no mocks)', () => {
  it('builds with valid VAPID keys and classifies a network failure as retryable', async () => {
    const { publicKey, privateKey } = generateVAPIDKeys()
    const channel = createWebPushChannel(publicKey, privateKey, 'mailto:test@example.com')
    assert.equal(channel.configured, true)
    const target = { endpoint: 'https://127.0.0.1:1/unreachable', p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM', auth: 'tBHItJI5svbpez7KI4CCXg' }
    await assert.rejects(
      () => channel.send(target, { title: 't', body: 'b', url: '/notifications', tag: 'x' }),
      (e: unknown) => e instanceof DeliveryError && e.retryable === true,
    )
  })
  it('rejects a malformed VAPID subject instead of silently misbehaving', () => {
    const { publicKey, privateKey } = generateVAPIDKeys()
    assert.throws(() => createWebPushChannel(publicKey, privateKey, 'not-a-mailto-or-url'))
  })
})
