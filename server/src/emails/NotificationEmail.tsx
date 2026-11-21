import { Text } from '@react-email/components'
import { ButtonLink, EmailLayout } from './EmailLayout'

export interface NotificationEmailProps {
  title: string
  message: string
  priority: string
  category: string
  reason: string | null
  openUrl: string
  unsubscribeUrl: string
  settingsUrl: string
}

/** Instant email for a HIGH priority notification. */
export default function NotificationEmail(p: NotificationEmailProps) {
  return (
    <EmailLayout
      preview={p.message.slice(0, 90)}
      unsubscribeUrl={p.unsubscribeUrl}
      unsubscribeLabel={`Unsubscribe from ${p.category.toLowerCase()} emails`}
      settingsUrl={p.settingsUrl}
    >
      <Text style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: '#b91c1c', margin: '0 0 8px' }}>
        {p.priority} PRIORITY · {p.category}
      </Text>
      <Text style={{ fontSize: 20, fontWeight: 700, color: '#111827', lineHeight: '28px', margin: '0 0 12px' }}>{p.title}</Text>
      <Text style={{ fontSize: 15, color: '#374151', lineHeight: '24px', margin: 0 }}>{p.message}</Text>
      {p.reason && <Text style={{ fontSize: 12, color: '#6b7280', margin: '16px 0 0' }}>Why this matters: {p.reason}</Text>}
      <ButtonLink href={p.openUrl}>Open in Notify</ButtonLink>
    </EmailLayout>
  )
}
