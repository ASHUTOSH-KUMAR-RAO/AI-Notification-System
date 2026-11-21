import { toast } from 'sonner'
import type { Notification } from '@/api/notifications'

/** One toast per notification; HIGH priority stands out (red, stays longer). */
export function toastNotification(n: Notification, onView: () => void) {
  const opts = { id: n.id, description: n.message, action: { label: 'View', onClick: onView } }
  if (n.priority === 'HIGH') return toast.error(n.title, { ...opts, duration: 10_000 })
  if (n.priority === 'MEDIUM') return toast.info(n.title, { ...opts, duration: 5_000 })
  return toast(n.title, { ...opts, duration: 4_000 })
}
