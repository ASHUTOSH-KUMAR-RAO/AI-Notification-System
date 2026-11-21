import { render } from '@react-email/components'
import { Resend } from 'resend'
import { appUrl, env } from '../../config/env'
import DigestEmail, { type DigestEmailProps } from '../../emails/DigestEmail'
import NotificationEmail, { type NotificationEmailProps } from '../../emails/NotificationEmail'
import { DeliveryError } from './errors'

export interface EmailChannel {
  configured: boolean
  sendNotification(to: string, props: NotificationEmailProps): Promise<void>
  sendDigest(to: string, props: DigestEmailProps): Promise<void>
}

export const notConfiguredEmail: EmailChannel = {
  configured: false,
  sendNotification: async () => {
    throw new DeliveryError('Email is not configured', false)
  },
  sendDigest: async () => {
    throw new DeliveryError('Email is not configured', false)
  },
}

/** List-Unsubscribe headers let Gmail/Apple Mail show a native one-click "Unsubscribe" button. */
const unsubscribeHeaders = (url: string) => ({
  'List-Unsubscribe': `<${url}>`,
  'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
})

export function createResendChannel(apiKey: string, from: string): EmailChannel {
  const resend = new Resend(apiKey)

  async function send(to: string, subject: string, element: React.ReactElement, unsubscribeUrl: string) {
    let result
    try {
      const [html, text] = await Promise.all([render(element), render(element, { plainText: true })])
      result = await resend.emails.send({ from, to, subject, html, text, headers: unsubscribeHeaders(unsubscribeUrl) })
    } catch (err) {
      throw new DeliveryError(`Email request failed: ${err instanceof Error ? err.message : 'unknown'}`, true) // network-level: retry
    }
    if (result.error) {
      const status = (result.error as { statusCode?: number | null }).statusCode
      // 429 and 5xx are transient; other 4xx (bad address, unverified domain, invalid key) will not succeed on retry.
      const retryable = status == null || status === 429 || status >= 500
      throw new DeliveryError(`Resend: ${result.error.message}`, retryable)
    }
  }

  return {
    configured: true,
    sendNotification: (to, p) =>
      send(to, `[${p.priority}] ${p.title}`.slice(0, 150), <NotificationEmail {...p} />, p.unsubscribeUrl),
    sendDigest: (to, p) =>
      send(to, `Your daily digest: ${p.total} unread`, <DigestEmail {...p} />, p.unsubscribeUrl),
  }
}

let channel: EmailChannel | undefined
export const getEmailChannel = () =>
  (channel ??= env.RESEND_API_KEY ? createResendChannel(env.RESEND_API_KEY, env.EMAIL_FROM) : notConfiguredEmail)

export const settingsUrl = `${appUrl}/settings`
export const inboxUrl = `${appUrl}/notifications`
