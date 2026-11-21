import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { db } from '../config/db'
import { getOverview } from './analytics.service'

const suite = process.env.TEST_DATABASE_URL ? describe : describe.skip

suite('analytics overview', () => {
  it('aggregates only the user\'s own data and zero-fills days', async () => {
    const mk = (n: string) => db.user.create({ data: { name: n, email: `${n}${Date.now()}@example.com`, password: 'x' } })
    const [a, b] = await Promise.all([mk('a'), mk('b')])
    const base = { title: 't', message: 'm' }
    await db.notification.createMany({
      data: [
        { ...base, userId: a.id, priority: 'HIGH', isRead: true },
        { ...base, userId: a.id, priority: 'LOW', isSpam: true },
        { ...base, userId: a.id, priority: 'MEDIUM', aiStatus: 'FALLBACK' },
        { ...base, userId: b.id, priority: 'HIGH' },
      ],
    })

    const o = await getOverview(a.id, '7d')
    assert.equal(o.current.total, 3)
    assert.equal(o.current.spam, 1)
    assert.equal(o.current.read, 1)
    assert.equal(o.current.unread, 1)
    assert.equal(o.current.aiFallback, 1)
    assert.equal(o.current.readRate, 0.5) // 1 read of 2 non-spam
    assert.equal(o.overTime.length, 7)
    assert.equal(o.overTime.reduce((s, d) => s + d.HIGH + d.MEDIUM + d.LOW, 0), 2) // spam excluded
    assert.equal(o.recentHigh.length, 1)
    assert.equal(o.delivery.length, 3)

    await db.user.deleteMany({ where: { id: { in: [a.id, b.id] } } })
  })
})
