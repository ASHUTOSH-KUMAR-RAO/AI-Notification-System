import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { lockDemoPatch } from './demo'
import { log } from '../utils/logger'

describe('demo account guard', () => {
  it('forces email, push and digest off in any settings patch', () => {
    const out = lockDemoPatch({ digestEnabled: true, categories: { ORDER: { channels: { email: true, push: true, inApp: true } }, SOCIAL: { enabled: false } } })
    assert.equal(out.digestEnabled, false)
    assert.deepEqual(out.categories?.ORDER?.channels, { email: false, push: false, inApp: true })
    assert.equal(out.categories?.SOCIAL?.enabled, false)
  })
})

describe('logger', () => {
  it('keeps only the first line of an error message (Prisma appends the query)', () => {
    const lines: string[] = []
    const orig = process.stderr.write.bind(process.stderr)
    process.stderr.write = ((c: string) => (lines.push(c), true)) as typeof process.stderr.write
    try {
      log.error('boom', new Error('first line\nwhere: { title: "secret notification text" }'))
    } finally {
      process.stderr.write = orig
    }
    assert.ok(lines[0].includes('first line'))
    assert.ok(!lines[0].includes('secret'))
  })
})
