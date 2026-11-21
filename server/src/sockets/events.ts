import type { NotificationDto } from '../services/notification.service'

/** Server -> client events. Keep in sync with client/src/lib/realtime.ts. */
export interface ServerToClientEvents {
  /** lert = the user's preferences say this should toast now (muted / quiet hours / minimum priority are applied server-side). */
  'notification:new': (notification: NotificationDto & { alert: boolean }) => void
  /** A notification that did not alert on arrival but qualifies after analysis (e.g. priority raised). */
  'notification:alert': (notification: NotificationDto) => void
  'notification:updated': (notification: NotificationDto) => void
  'groups:updated': () => void
  'notification:read': (payload: { id: string }) => void
  'notification:read-all': () => void
  'notification:deleted': (payload: { ids: string[] }) => void
  'unread-count:update': (payload: { count: number }) => void
}

export interface SocketData {
  userId: string
}

export const userRoom = (userId: string) => `user:${userId}`


