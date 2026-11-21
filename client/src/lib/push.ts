import { pushSubscribe, pushUnsubscribe } from '@/api/preferences'

export const pushSupported = () =>
  typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

function urlBase64ToUint8Array(base64: string) {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(padded)
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

async function registration() {
  const reg = await navigator.serviceWorker.register('/sw.js')
  await navigator.serviceWorker.ready
  return reg
}

export async function currentPushSubscription() {
  const reg = await navigator.serviceWorker.getRegistration('/sw.js')
  return (await reg?.pushManager.getSubscription()) ?? null
}

/** Must be called from a click: asks for permission, subscribes this browser and tells the server. */
export async function enablePush(publicKey: string) {
  if ((await Notification.requestPermission()) !== 'granted') throw new Error('Notification permission was not granted')
  const reg = await registration()
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) }))
  const json = sub.toJSON()
  if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) throw new Error('The browser returned an incomplete push subscription')
  await pushSubscribe({ endpoint: json.endpoint, keys: { p256dh: json.keys.p256dh, auth: json.keys.auth } })
}

export async function disablePush() {
  const sub = await currentPushSubscription()
  if (!sub) return
  await pushUnsubscribe(sub.endpoint).catch(() => {}) // even if the server call fails, drop the browser side
  await sub.unsubscribe()
}

/** On logout: stop this browser receiving the previous user's pushes. Never throws. */
export async function teardownPush() {
  try {
    if (pushSupported()) await disablePush()
  } catch {
    // best effort
  }
}
