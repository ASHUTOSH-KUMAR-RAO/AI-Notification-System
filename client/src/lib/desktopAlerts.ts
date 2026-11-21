import type { Notification } from '@/api/notifications'

export const desktopAlertsSupported = () => typeof window !== 'undefined' && 'Notification' in window

export const desktopPermission = (): NotificationPermission | 'unsupported' =>
  desktopAlertsSupported() ? Notification.permission : 'unsupported'

/** Must be called from a user gesture (button click). */
export const requestDesktopPermission = () => Notification.requestPermission()

/** Shows a native notification only when allowed and the tab is not in front (toasts cover the visible case). */
export function showDesktopNotification(n: Notification) {
  if (desktopPermission() !== 'granted' || !document.hidden) return
  try {
    const shown = new Notification(n.title, { body: n.message, tag: n.id })
    shown.onclick = () => {
      window.focus()
      shown.close()
    }
  } catch {
    // Some mobile browsers only allow notifications via a service worker; ignore.
  }
}
