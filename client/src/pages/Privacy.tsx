import { Link } from 'react-router-dom'
import { LegalPage } from '@/components/legal/LegalPage'

export default function Privacy() {
  return (
    <LegalPage
      title="Privacy Policy"
      description="What data Notify stores, which services process it and how to control it."
      updated="November 21, 2026"
      sections={[
        {
          heading: 'What we store',
          body: (
            <ul>
              <li><strong>Account:</strong> your name, your email address and a bcrypt hash of your password. The password itself is never stored.</li>
              <li><strong>Notifications:</strong> the title, message, category, priority, optional link and read state of each notification, plus the results of AI analysis (priority, category, spam flag, summary).</li>
              <li><strong>Preferences:</strong> channel choices per category, quiet hours, time zone, daily digest and alert threshold.</li>
              <li><strong>Engagement signals:</strong> when you open, click, dismiss or rate a notification. They are used only to nudge priority for you, never for advertising.</li>
              <li><strong>Push subscriptions:</strong> if you enable web push, the endpoint and keys your browser provides for this device.</li>
              <li><strong>Delivery records:</strong> which channel delivered or failed to deliver a notification, and when.</li>
              <li><strong>Session:</strong> a hashed refresh token so you stay signed in (see the <Link to="/cookies">Cookie Policy</Link>).</li>
            </ul>
          ),
        },
        {
          heading: 'Services that process your data',
          body: (
            <ul>
              <li><strong>Groq</strong> receives the title, message and category of a notification so an AI model can rate its priority, detect spam and write summaries. If the AI is unavailable, simple built-in rules are used instead and nothing is sent.</li>
              <li><strong>Resend</strong> receives your email address and the notification content when you turn on email delivery or the daily digest.</li>
              <li><strong>Browser push services</strong> (operated by your browser vendor) deliver web push messages if you enable them.</li>
              <li><strong>Vercel</strong> hosts the website and proxies API requests, <strong>Railway</strong> runs the API, and <strong>Supabase</strong> hosts the PostgreSQL database.</li>
            </ul>
          ),
        },
        {
          heading: 'What we do not do',
          body: (
            <ul>
              <li>We do not sell or share your data for advertising.</li>
              <li>We do not use analytics, tracking pixels or advertising cookies.</li>
              <li>Server logs record request paths, status codes and timing. They do not contain notification text, tokens or secrets, and query strings are not logged.</li>
            </ul>
          ),
        },
        {
          heading: 'Demo account',
          body: <p>The shared demo account (<code>demo@notify.dev</code>) contains sample data only. Email, push and digest are disabled for it. Do not enter personal information there.</p>,
        },
        {
          heading: 'Your choices',
          body: (
            <ul>
              <li>Change channels, quiet hours and thresholds any time in Settings.</li>
              <li>Turn off web push from Settings or in your browser's site permissions.</li>
              <li>Log out to end your session. The refresh cookie is removed immediately.</li>
              <li>To have your account and its data deleted, contact the maintainer through the place where you found this project.</li>
            </ul>
          ),
        },
        {
          heading: 'Security',
          body: <p>Passwords are hashed, the short-lived access token is kept only in memory, the refresh cookie is <code>HttpOnly</code>, requests are rate limited and the database blocks direct public access. No system is perfectly secure, and this is a portfolio project, so please keep that in mind.</p>,
        },
        {
          heading: 'Changes',
          body: <p>If this policy changes, the date at the top of the page is updated.</p>,
        },
      ]}
    />
  )
}
