/**
 * npm run seed:demo [-- --force]
 * Creates (or recreates) a demo user with ~75 days of realistic notifications, events and deliveries.
 * Refuses to run when NODE_ENV=production unless --force is passed. Local demo data only.
 */
import 'dotenv/config'
import { randomUUID } from 'node:crypto'
import bcrypt from 'bcryptjs'
import { db } from '../config/db'
import { DEMO_EMAIL } from '../config/demo'
import { env } from '../config/env'
import type { Prisma } from '../generated/prisma/client'
import { recomputeEngagement } from '../services/engagement.service'

const DEMO_PASSWORD = 'Demo1234!'
const DAYS = 75
const DAY = 86_400_000

type Category = 'SYSTEM' | 'ORDER' | 'SECURITY' | 'SOCIAL' | 'PROMOTION' | 'REMINDER'
type Priority = 'HIGH' | 'MEDIUM' | 'LOW'

interface Template {
  category: Category
  priority: Priority
  title: string
  message: string
  groupKey?: string
  weight: number
}

const TEMPLATES: Template[] = [
  { category: 'ORDER', priority: 'MEDIUM', title: 'Your order has shipped', message: 'Order #{n} is on its way and should arrive within 2 days. Track it from your orders page.', groupKey: 'order-shipping', weight: 10 },
  { category: 'ORDER', priority: 'HIGH', title: 'Payment failed', message: 'We could not charge your card for order #{n}. Update your payment method to avoid cancellation.', weight: 3 },
  { category: 'ORDER', priority: 'LOW', title: 'Order delivered', message: 'Order #{n} was delivered. We hope you enjoy it! Leave a review when you have a moment.', groupKey: 'order-shipping', weight: 6 },
  { category: 'SECURITY', priority: 'HIGH', title: 'New sign-in from Chrome on Windows', message: 'We noticed a new sign-in to your account. If this was not you, reset your password immediately.', weight: 4 },
  { category: 'SECURITY', priority: 'HIGH', title: 'Your verification code is {c}', message: 'Use this one-time code to finish signing in. It expires in 10 minutes. Never share it.', weight: 4 },
  { category: 'SECURITY', priority: 'MEDIUM', title: 'Password changed', message: 'Your password was changed successfully. Contact support if this was not you.', weight: 1 },
  { category: 'SOCIAL', priority: 'LOW', title: 'Maya liked your post', message: 'Maya and 3 others liked your post "Shipping my side project".', groupKey: 'social-likes', weight: 12 },
  { category: 'SOCIAL', priority: 'MEDIUM', title: 'Daniel commented on your photo', message: 'Daniel: "This looks amazing, where was it taken?"', groupKey: 'social-comments', weight: 7 },
  { category: 'SOCIAL', priority: 'LOW', title: 'You have a new follower', message: 'Priya started following you.', groupKey: 'social-follows', weight: 6 },
  { category: 'PROMOTION', priority: 'LOW', title: 'Weekend sale: up to 40% off', message: 'Our biggest sale of the season starts now. Limited stock, grab your favourites before Sunday.', groupKey: 'promo-sale', weight: 9 },
  { category: 'PROMOTION', priority: 'LOW', title: 'Your coupon expires soon', message: 'Use code SAVE15 for 15% off. Offer ends in 48 hours.', groupKey: 'promo-sale', weight: 5 },
  { category: 'REMINDER', priority: 'MEDIUM', title: 'Team standup in 15 minutes', message: 'Daily standup starts at 10:00. Join from the calendar link.', weight: 8 },
  { category: 'REMINDER', priority: 'HIGH', title: 'Invoice due tomorrow', message: 'Invoice #{n} for $480 is due tomorrow. Pay now to avoid a late fee.', weight: 3 },
  { category: 'REMINDER', priority: 'LOW', title: 'Weekly review', message: 'Take five minutes to review your goals for the week.', weight: 4 },
  { category: 'SYSTEM', priority: 'MEDIUM', title: 'Scheduled maintenance tonight', message: 'The platform will be briefly unavailable from 02:00 to 02:15 UTC for maintenance.', weight: 3 },
  { category: 'SYSTEM', priority: 'HIGH', title: 'Service degradation detected', message: 'Our API is experiencing elevated error rates. The team is investigating.', weight: 2 },
  { category: 'SYSTEM', priority: 'LOW', title: 'New feature: dark mode', message: 'You can now switch between light and dark themes from the top bar.', weight: 3 },
]

const SPAM = [
  { title: 'YOU WON $1,000,000!!!', message: 'Click here now to claim your free prize. Send your bank details to receive the payment.' },
  { title: 'Urgent: verify your account', message: 'Your account will be closed. Click http://secure-login.example to confirm your password now.' },
]

// Small deterministic PRNG (mulberry32) so repeated seeding gives the same demo.
let state = 20260101
const rand = () => {
  state = (state + 0x6d2b79f5) | 0
  let t = Math.imul(state ^ (state >>> 15), 1 | state)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
const pick = <T>(xs: T[]) => xs[Math.floor(rand() * xs.length)]
const chance = (p: number) => rand() < p
const fill = (s: string) => s.replace('{n}', String(10000 + Math.floor(rand() * 89999))).replace('{c}', String(100000 + Math.floor(rand() * 899999)))
const totalWeight = TEMPLATES.reduce((a, t) => a + t.weight, 0)
function weighted() {
  let r = rand() * totalWeight
  for (const t of TEMPLATES) if ((r -= t.weight) < 0) return t
  return TEMPLATES[0]
}

async function main() {
  if (env.NODE_ENV === 'production' && !process.argv.includes('--force')) {
    console.error('Refusing to seed demo data with NODE_ENV=production. Pass --force if you really mean it.')
    process.exit(1)
  }

  await db.user.deleteMany({ where: { email: DEMO_EMAIL } }) // cascades to everything demo-owned
  const user = await db.user.create({
    data: { name: 'Demo User', email: DEMO_EMAIL, password: await bcrypt.hash(DEMO_PASSWORD, 10) },
  })
  await db.userPreference.create({
    data: {
      userId: user.id,
      timeZone: 'UTC',
      quietHoursEnabled: true,
      // The demo login is shared: no real email/push/digest sending (also enforced server-side in config/demo.ts).
      digestEnabled: false,
      categories: Object.fromEntries(
        ['SYSTEM', 'ORDER', 'SECURITY', 'SOCIAL', 'PROMOTION', 'REMINDER'].map((c) => [c, { enabled: true, channels: { inApp: true, email: false, push: false } }]),
      ),
    },
  })

  const now = Date.now()
  const notifications: Prisma.NotificationCreateManyInput[] = []
  const events: { id: string; userId: string; notificationId: string; type: 'OPENED' | 'CLICKED' | 'DISMISSED'; timeToOpenMs: number | null; createdAt: Date }[] = []
  const deliveries: { id: string; notificationId: string; userId: string; channel: 'IN_APP' | 'EMAIL' | 'PUSH'; status: 'SENT' | 'FAILED' | 'SKIPPED'; attempts: number; error: string | null; sentAt: Date | null; createdAt: Date }[] = []

  for (let d = DAYS - 1; d >= 0; d--) {
    const dayStart = now - d * DAY
    const weekday = new Date(dayStart).getUTCDay()
    const growth = 0.55 + 0.45 * ((DAYS - d) / DAYS) // volume ramps up over time so the trend line has a story
    const count = Math.round((weekday === 0 || weekday === 6 ? 2 : 5) * growth + rand() * 3)

    for (let i = 0; i < count; i++) {
      const spam = chance(0.05)
      const t = spam ? null : weighted()
      const base = spam ? pick(SPAM) : t!
      const hour = 7 + Math.floor(rand() * 15)
      const createdAt = new Date(Math.min(now - 60_000, Math.floor(dayStart / DAY) * DAY + hour * 3_600_000 + Math.floor(rand() * 3_600_000)))
      const ageDays = (now - createdAt.getTime()) / DAY
      const isRead = !spam && (ageDays > 3 ? chance(0.92) : ageDays > 1 ? chance(0.65) : chance(0.35))
      const id = randomUUID()
      const category: Category = spam ? 'PROMOTION' : t!.category
      const priority: Priority = spam ? 'LOW' : t!.priority
      const aiDone = chance(0.86)
      const openMs = Math.round((priority === 'HIGH' ? 90_000 : priority === 'MEDIUM' ? 600_000 : 3_600_000) * (0.3 + rand() * 1.7))

      notifications.push({
        id,
        userId: user.id,
        title: fill(base.title),
        message: fill(base.message),
        category,
        priority,
        isRead,
        readAt: isRead ? new Date(createdAt.getTime() + openMs) : null,
        createdAt,
        updatedAt: createdAt,
        aiStatus: aiDone ? 'DONE' : 'FALLBACK',
        aiPriorityReason: aiDone ? (spam ? 'Looks like a scam: urgency and a request for credentials.' : `Classified as ${priority.toLowerCase()} priority ${category.toLowerCase()} notification.`) : 'Estimated from keywords.',
        isSpam: spam,
        spamScore: spam ? 0.9 + rand() * 0.09 : null,
        groupKey: spam ? null : (t!.groupKey ?? null),
        analyzedAt: createdAt,
      })

      if (isRead) {
        events.push({ id: randomUUID(), userId: user.id, notificationId: id, type: 'OPENED', timeToOpenMs: openMs, createdAt: new Date(createdAt.getTime() + openMs) })
        if (chance(0.3)) events.push({ id: randomUUID(), userId: user.id, notificationId: id, type: 'CLICKED', timeToOpenMs: null, createdAt: new Date(createdAt.getTime() + openMs + 4000) })
      } else if (!spam && chance(0.12)) {
        events.push({ id: randomUUID(), userId: user.id, notificationId: id, type: 'DISMISSED', timeToOpenMs: null, createdAt: new Date(createdAt.getTime() + 30_000) })
      }

      if (spam) continue
      const deliver = (channel: 'IN_APP' | 'EMAIL' | 'PUSH', status: 'SENT' | 'FAILED' | 'SKIPPED', error: string | null = null) =>
        deliveries.push({ id: randomUUID(), notificationId: id, userId: user.id, channel, status, attempts: status === 'FAILED' ? 4 : 1, error, sentAt: status === 'SENT' ? createdAt : null, createdAt })
      deliver('IN_APP', 'SENT')
      if (category === 'SOCIAL' || category === 'PROMOTION') deliver('EMAIL', 'SKIPPED')
      else deliver('EMAIL', chance(0.06) ? 'FAILED' : 'SENT')
      if (category === 'SECURITY' || category === 'ORDER') deliver('PUSH', chance(0.1) ? 'FAILED' : 'SENT')
    }
  }
  for (const dv of deliveries) if (dv.status === 'FAILED') dv.error = 'Provider unavailable'

  await db.notification.createMany({ data: notifications })
  await db.notificationEvent.createMany({ data: events })
  await db.notificationDelivery.createMany({ data: deliveries })
  for (const c of ['SYSTEM', 'ORDER', 'SECURITY', 'SOCIAL', 'PROMOTION', 'REMINDER'] as const) await recomputeEngagement(user.id, c)

  console.log(`Seeded ${notifications.length} notifications, ${events.length} events, ${deliveries.length} deliveries over ${DAYS} days.`)
  console.log('\nDemo login (local only):')
  console.log(`  email:    ${DEMO_EMAIL}`)
  console.log(`  password: ${DEMO_PASSWORD}`)
  await db.$disconnect()
}

main().catch(async (e) => {
  console.error(e)
  await db.$disconnect()
  process.exit(1)
})
