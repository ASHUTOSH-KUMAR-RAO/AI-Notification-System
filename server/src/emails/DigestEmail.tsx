import { Text } from '@react-email/components'
import { ButtonLink, EmailLayout } from './EmailLayout'

export interface DigestGroup {
  /** AI (or rule-based) one-line summary; for a single notification this is just its title. */
  summary: string
  count: number
  titles: string[]
}

export interface DigestEmailProps {
  name: string
  total: number
  groups: DigestGroup[]
  openUrl: string
  unsubscribeUrl: string
  settingsUrl: string
}

/** Daily digest of unread LOW/MEDIUM notifications, grouped. */
export default function DigestEmail(p: DigestEmailProps) {
  return (
    <EmailLayout
      preview={`${p.total} unread notification${p.total === 1 ? '' : 's'}`}
      unsubscribeUrl={p.unsubscribeUrl}
      unsubscribeLabel="Unsubscribe from the daily digest"
      settingsUrl={p.settingsUrl}
    >
      <Text style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: '0 0 6px' }}>Your daily digest</Text>
      <Text style={{ fontSize: 14, color: '#6b7280', margin: '0 0 20px' }}>
        Hi {p.name}, you have {p.total} unread notification{p.total === 1 ? '' : 's'}.
      </Text>
      {p.groups.map((g, i) => (
        <div key={i} style={{ margin: '0 0 16px', padding: '12px 14px', border: '1px solid #e5e7eb', borderRadius: 8 }}>
          <Text style={{ fontSize: 15, fontWeight: 600, color: '#111827', margin: '0 0 4px' }}>{g.summary}</Text>
          {g.count > 1 &&
            g.titles.slice(0, 4).map((t, j) => (
              <Text key={j} style={{ fontSize: 13, color: '#6b7280', margin: '0 0 2px' }}>
                • {t}
              </Text>
            ))}
        </div>
      ))}
      <ButtonLink href={p.openUrl}>Open your inbox</ButtonLink>
    </EmailLayout>
  )
}
