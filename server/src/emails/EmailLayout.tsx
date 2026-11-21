import { Body, Container, Head, Hr, Html, Link, Preview, Section, Text } from '@react-email/components'
import type { ReactNode } from 'react'

const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'

/** Shared shell: narrow single column that reads well on phones, with an unsubscribe footer. */
export function EmailLayout({
  preview,
  children,
  unsubscribeUrl,
  unsubscribeLabel,
  settingsUrl,
}: {
  preview: string
  children: ReactNode
  unsubscribeUrl: string
  unsubscribeLabel: string
  settingsUrl: string
}) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ backgroundColor: '#f4f4f5', margin: 0, padding: '24px 12px', fontFamily: font }}>
        <Container style={{ maxWidth: 560, margin: '0 auto', backgroundColor: '#ffffff', borderRadius: 12, padding: '28px 24px' }}>
          <Text style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: '0 0 20px' }}>Notify</Text>
          {children}
          <Hr style={{ borderColor: '#e5e7eb', margin: '28px 0 16px' }} />
          <Text style={{ fontSize: 12, color: '#6b7280', lineHeight: '18px', margin: 0 }}>
            <Link href={unsubscribeUrl} style={{ color: '#6b7280' }}>
              {unsubscribeLabel}
            </Link>
            {' · '}
            <Link href={settingsUrl} style={{ color: '#6b7280' }}>
              Notification settings
            </Link>
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const ButtonLink = ({ href, children }: { href: string; children: ReactNode }) => (
  <Section style={{ margin: '24px 0 0' }}>
    <Link
      href={href}
      style={{ display: 'inline-block', backgroundColor: '#111827', color: '#ffffff', fontSize: 14, fontWeight: 600, padding: '12px 20px', borderRadius: 8, textDecoration: 'none' }}
    >
      {children}
    </Link>
  </Section>
)
