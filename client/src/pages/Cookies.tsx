import { Link } from 'react-router-dom'
import { LegalPage } from '@/components/legal/LegalPage'

export default function Cookies() {
  return (
    <LegalPage
      title="Cookie Policy"
      description="The one cookie and the small browser storage entries Notify uses."
      updated="November 21, 2026"
      sections={[
        {
          heading: 'The short version',
          body: <p>Notify only uses what it needs to work. There are no advertising, analytics or tracking cookies, and nothing here is shared with third parties.</p>,
        },
        {
          heading: 'Cookie',
          body: (
            <ul>
              <li>
                <strong><code>refreshToken</code></strong>: keeps you signed in. It is <code>HttpOnly</code> (scripts cannot read it), <code>Secure</code> in production, <code>SameSite=Lax</code>, limited to the <code>/api/auth</code> path and expires after 7 days. It is replaced each time it is used and deleted when you log out. It is set on the same domain as the website.
              </li>
            </ul>
          ),
        },
        {
          heading: 'Browser storage',
          body: (
            <ul>
              <li><code>theme</code> (localStorage): your light, dark or system choice.</li>
              <li><code>notify:sidebar-collapsed</code> (localStorage): whether the sidebar is collapsed.</li>
              <li><code>notify:cookie-notice</code> (localStorage): remembers that you dismissed the cookie notice.</li>
              <li>The short-lived access token is kept only in memory and disappears when you close or reload the tab.</li>
              <li>If you enable web push, your browser stores a service worker (<code>sw.js</code>) and a push subscription for this site.</li>
            </ul>
          ),
        },
        {
          heading: 'Your control',
          body: <p>You can clear cookies and site data in your browser at any time. You will be signed out and the theme and sidebar settings reset. Blocking the refresh cookie means you will have to sign in again after every reload. See also the <Link to="/privacy">Privacy Policy</Link>.</p>,
        },
      ]}
    />
  )
}
