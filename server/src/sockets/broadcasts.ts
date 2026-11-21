import type { Server } from 'socket.io'
import { shouldAlertInApp } from '../services/delivery/delivery.service'
import { getUnreadCount } from '../services/notification.service'
import { notificationEvents } from '../utils/notificationEvents'
import { userRoom, type ServerToClientEvents, type SocketData } from './events'
import { log } from '../utils/logger'

type IO = Server<Record<string, never>, ServerToClientEvents, Record<string, never>, SocketData>

/** Never let a socket problem break the HTTP request that triggered the event. */
const safe =
  <A extends unknown[]>(fn: (...args: A) => void | Promise<void>) =>
  (...args: A) => {
    Promise.resolve()
      .then(() => fn(...args))
      .catch((err) => log.error('[socket] broadcast failed:', err instanceof Error ? err.message : err))
  }

/**
 * Bridges notificationEvents -> the user's private room. Every tab/device of that user is in the room,
 * so all of them stay in sync. After each change the authoritative unread count is pushed too.
 */
export function registerNotificationBroadcasts(io: IO) {
  const to = (userId: string) => io.to(userRoom(userId))
  const pushCount = async (userId: string) => {
    to(userId).emit('unread-count:update', { count: await getUnreadCount(userId) })
  }

  notificationEvents.on('created', safe(async (userId, notification) => {
    // Preferences are applied here so every tab of the user gets the same decision.
    const alert = await shouldAlertInApp(userId, notification).catch(() => false)
    to(userId).emit('notification:new', { ...notification, alert })
    await pushCount(userId)
  }))
  notificationEvents.on('alert', safe((userId, notification) => {
    to(userId).emit('notification:alert', notification)
  }))
  notificationEvents.on('updated', safe(async (userId, notification) => {
    to(userId).emit('notification:updated', notification)
    await pushCount(userId) // a spam flag change alters the unread count
  }))
  notificationEvents.on('groups-updated', safe((userId) => {
    to(userId).emit('groups:updated')
  }))
  notificationEvents.on('read', safe(async (userId, id) => {
    to(userId).emit('notification:read', { id })
    await pushCount(userId)
  }))
  notificationEvents.on('read-all', safe(async (userId) => {
    to(userId).emit('notification:read-all')
    await pushCount(userId)
  }))
  notificationEvents.on('deleted', safe(async (userId, ids) => {
    to(userId).emit('notification:deleted', { ids })
    await pushCount(userId)
  }))
}


