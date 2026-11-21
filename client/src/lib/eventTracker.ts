import { api, API_URL, getAccessToken } from '@/lib/api'

export type TrackedEvent = 'OPENED' | 'CLICKED' | 'DISMISSED'
interface Queued {
  notificationId: string
  type: TrackedEvent
}

const FLUSH_MS = 4_000
const MAX_BATCH = 50
const MAX_QUEUE = 200

const queue = new Map<string, Queued>()
const sent = new Set<string>() // the server stores one event per type per notification, so never resend
let timer: ReturnType<typeof setTimeout> | undefined

/**
 * Records that the user opened / clicked / dismissed a notification. Fire-and-forget: it only queues in memory
 * and returns immediately; a batch is sent every few seconds and when the page is hidden.
 */
export function track(notificationId: string, type: TrackedEvent) {
  if (!getAccessToken()) return
  const key = `${notificationId}:${type}`
  if (sent.has(key) || queue.has(key) || queue.size >= MAX_QUEUE) return
  queue.set(key, { notificationId, type })
  timer ??= setTimeout(() => void flush(), FLUSH_MS)
}

async function flush(keepalive = false) {
  clearTimeout(timer)
  timer = undefined
  const batch = [...queue.entries()].slice(0, MAX_BATCH)
  if (batch.length === 0) return
  batch.forEach(([key]) => queue.delete(key))
  const events = batch.map(([, e]) => e)

  try {
    if (keepalive) {
      // On page hide axios may be cancelled. sendBeacon cannot carry the Authorization header,
      // so use fetch with keepalive, which the browser completes after the page is gone.
      void fetch(`${API_URL}/notifications/events`, {
        method: 'POST',
        keepalive: true,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAccessToken()}` },
        body: JSON.stringify({ events }),
      }).catch(() => {})
    } else {
      await api.post('/notifications/events', { events })
    }
    batch.forEach(([key]) => sent.add(key))
  } catch {
    batch.forEach(([key, e]) => queue.size < MAX_QUEUE && queue.set(key, e)) // try again with the next batch
    timer ??= setTimeout(() => void flush(), FLUSH_MS * 4)
  }
  if (queue.size > 0 && keepalive) void flush(true)
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && void flush(true))
  window.addEventListener('pagehide', () => void flush(true))
}

/** Called on login/logout so one account's events never leak into the next session. */
export function resetTracker() {
  clearTimeout(timer)
  timer = undefined
  queue.clear()
  sent.clear()
}
