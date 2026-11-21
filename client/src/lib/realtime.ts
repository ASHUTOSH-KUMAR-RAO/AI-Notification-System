import type { QueryClient } from '@tanstack/react-query'
import type { Socket } from 'socket.io-client'
import type { Notification } from '@/api/notifications'
import { toast } from 'sonner'
import { analyticsKeys } from '@/api/analytics'
import { applyRead, mapLists, notificationKeys, removeIds, upsertNotification } from '@/lib/notificationCache'

/** Server -> client events. Keep in sync with server/src/sockets/events.ts. */
export interface ServerToClientEvents {
  /** lert is decided by the server from your preferences (muted, quiet hours, minimum priority). */
  'notification:new': (notification: Notification & { alert: boolean }) => void
  /** Qualified for an alert only after AI analysis (e.g. its priority was raised). */
  'notification:alert': (notification: Notification) => void
  'notification:updated': (notification: Notification) => void
  'groups:updated': () => void
  'notification:read': (payload: { id: string }) => void
  'notification:read-all': () => void
  'notification:deleted': (payload: { ids: string[] }) => void
  'unread-count:update': (payload: { count: number }) => void
}

export type AppSocket = Socket<ServerToClientEvents>

/**
 * Applies every pushed event straight to the TanStack Query cache (no refetch needed).
 * All updates are idempotent, so the echo of this tab's own optimistic change is harmless.
 * The server's unread-count is authoritative and always overwrites the local badge.
 */
export function registerRealtimeHandlers(socket: AppSocket, qc: QueryClient, onAlert: (n: Notification) => void) {
  // The grouped view is rebuilt server-side, so any change simply refetches it (only if it is on screen).
  const refreshGroups = () => void qc.invalidateQueries({ queryKey: notificationKeys.groups })

  // Dashboard stats: any notification change refreshes them, debounced so a burst causes one refetch.
  let statsTimer: ReturnType<typeof setTimeout> | undefined
  const refreshStats = () => {
    clearTimeout(statsTimer)
    statsTimer = setTimeout(() => void qc.invalidateQueries({ queryKey: analyticsKeys.all }), 1000)
  }

  socket.on('notification:new', (n) => {
    upsertNotification(qc, n)
    refreshGroups()
    refreshStats()
    if (n.alert && !n.isSpam) onAlert(n)
  })
  socket.on('notification:alert', (n) => {
    upsertNotification(qc, n)
    if (!n.isSpam) onAlert(n)
  })
  // AI finished (or the user re-analyzed / marked "not spam"): replace the item, move it between views if needed.
  socket.on('notification:updated', (n) => {
    upsertNotification(qc, n)
    if (n.isSpam) toast.dismiss(n.id) // the AI decided it is spam after we already toasted it
    refreshGroups()
    refreshStats()
  })
  socket.on('groups:updated', refreshGroups)
  socket.on('notification:read', ({ id }) => {
    mapLists(qc, (items, f) => applyRead(items, new Set([id]), f))
    refreshGroups()
    refreshStats()
  })
  socket.on('notification:read-all', () => {
    mapLists(qc, (items, f) => applyRead(items, 'all', f))
    refreshGroups()
    refreshStats()
  })
  socket.on('notification:deleted', ({ ids }) => {
    mapLists(qc, (items) => removeIds(items, new Set(ids)))
    refreshGroups()
    refreshStats()
  })
  socket.on('unread-count:update', ({ count }) => qc.setQueryData(notificationKeys.unread, count))
}

