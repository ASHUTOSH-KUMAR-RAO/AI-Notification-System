import { EventEmitter } from 'node:events'
import type { NotificationDto } from '../services/notification.service'

/**
 * In-process event bus. The notification service emits after each successful write;
 * the socket layer and the AI pipeline subscribe here instead of touching the service.
 * Every event carries the owning userId so subscribers can route it.
 */
interface Events {
  created: [userId: string, notification: NotificationDto]
  /** AI analysis finished, a notification was re-grouped, or the user marked it "not spam". */
  updated: [userId: string, notification: NotificationDto]
  /** A notification should alert the user now but did not at creation (e.g. the AI raised its priority). */
  alert: [userId: string, notification: NotificationDto]
  read: [userId: string, id: string]
  'read-all': [userId: string]
  deleted: [userId: string, ids: string[]]
  /** A cached group summary changed, so clients should refetch the grouped view. */
  'groups-updated': [userId: string]
}

class NotificationEvents extends EventEmitter<Events> {}
export const notificationEvents = new NotificationEvents()

