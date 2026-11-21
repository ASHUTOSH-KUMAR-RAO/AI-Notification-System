import crypto from 'node:crypto'

/** Small in-memory TTL + size-bounded cache (insertion-ordered Map as a cheap LRU). */
export class TtlCache<V> {
  private store = new Map<string, { value: V; expires: number }>()
  constructor(private ttlMs: number, private maxSize: number) {}

  get(key: string): V | undefined {
    const hit = this.store.get(key)
    if (!hit) return undefined
    if (hit.expires < Date.now()) return void this.store.delete(key)
    this.store.delete(key) // refresh recency
    this.store.set(key, hit)
    return hit.value
  }

  set(key: string, value: V) {
    this.store.delete(key)
    this.store.set(key, { value, expires: Date.now() + this.ttlMs })
    if (this.store.size > this.maxSize) this.store.delete(this.store.keys().next().value as string)
  }

  clear() {
    this.store.clear()
  }
}

/** Duplicate notifications (same text) are analysed once; the key is a hash so no content sits in memory keys/logs. */
export const contentHash = (...parts: (string | null | undefined)[]) =>
  crypto.createHash('sha256').update(parts.map((p) => p ?? '').join('\u0000')).digest('hex')

/** Per-user fixed-window limiter so one user cannot burn the whole Groq quota. */
export class UserRateLimiter {
  private windows = new Map<string, { count: number; resetAt: number }>()
  constructor(private limit: number, private windowMs = 60_000) {}

  tryConsume(userId: string): boolean {
    const now = Date.now()
    const w = this.windows.get(userId)
    if (!w || w.resetAt <= now) {
      this.windows.set(userId, { count: 1, resetAt: now + this.windowMs })
      return true
    }
    if (w.count >= this.limit) return false
    w.count++
    return true
  }
}
