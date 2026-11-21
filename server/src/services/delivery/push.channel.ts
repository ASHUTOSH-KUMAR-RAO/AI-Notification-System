import { sendNotification, setVapidDetails } from 'web-push'
import { env } from '../../config/env'
import { DeliveryError } from './errors'
import { log } from '../../utils/logger'

export interface PushTarget {
  endpoint: string
  p256dh: string
  auth: string
}

export interface PushPayload {
  title: string
  body: string
  url: string
  tag: string
}

export interface PushChannel {
  configured: boolean
  /** 'gone' means the browser says the subscription no longer exists (404/410): the caller must delete it. */
  send(target: PushTarget, payload: PushPayload): Promise<'ok' | 'gone'>
}

export const notConfiguredPush: PushChannel = {
  configured: false,
  send: async () => {
    throw new DeliveryError('Web push is not configured', false)
  },
}

export function createWebPushChannel(publicKey: string, privateKey: string, subject: string): PushChannel {
  setVapidDetails(subject, publicKey, privateKey)
  return {
    configured: true,
    async send(t, payload) {
      try {
        await sendNotification({ endpoint: t.endpoint, keys: { p256dh: t.p256dh, auth: t.auth } }, JSON.stringify(payload), {
          TTL: 60 * 60,
        })
        return 'ok'
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode
        if (status === 404 || status === 410) return 'gone'
        // 429/5xx/network are transient; other 4xx (e.g. 400/401/403) will not improve on retry.
        throw new DeliveryError(`Push failed (${status ?? 'network'})`, status == null || status === 429 || status >= 500)
      }
    },
  }
}

let channel: PushChannel | undefined
export function getPushChannel(): PushChannel {
  if (!channel) {
    try {
      channel =
        env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY
          ? createWebPushChannel(env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY, env.VAPID_SUBJECT)
          : notConfiguredPush
    } catch (err) {
      log.error('[push] invalid VAPID configuration, push disabled:', err instanceof Error ? err.message : err)
      channel = notConfiguredPush
    }
  }
  return channel
}

