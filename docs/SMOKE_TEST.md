# Live smoke test checklist

Run after both deployments are live. Replace `APP` with your Vercel URL and `API` with your Railway URL. Use a **new** email address for test accounts (not your existing personal test account).

## 1. Landing and Open Graph
- [ ] `APP` loads, hero feed animates, no console errors (only a harmless 401 on `/api/auth/me` when signed out).
- [ ] Open Graph image: paste the URL into https://www.opengraph.xyz or the LinkedIn Post Inspector, or open `APP/og.png` directly. You should see the 1200×630 card. View source and confirm `og:image` is `https://<your-domain>/og.png` (absolute).

## 2. Auth and cookie
- [ ] Register a new account → you land on the dashboard.
- [ ] Reload the page (F5) → you stay signed in (this proves the refresh cookie works).
- [ ] DevTools → Application → Cookies → `APP`: `refreshToken` is `HttpOnly`, `Secure`, `SameSite=Lax`, path `/api/auth`.
- [ ] Open a second tab of `APP` → also signed in (the refresh lock prevents one tab logging the other out).

## 3. Real-time across two tabs
- [ ] Open **Inbox** in two tabs, with the "Live" dot green in both.
- [ ] In tab A click **Send test**, fill a title and message, send. It appears in tab B **without reloading**, and the bell badge updates.

## 4. AI (Groq)
- [ ] Send: title `Payment failed`, message `Your card was declined for order 5521. Update your payment method within 24 hours.` (leave category and priority on Auto).
- [ ] It first shows "Analyzing..." then a priority badge with a sparkle. Hover the badge: the tooltip starts with `AI:` (not "Basic rules"), which means Groq answered.

## 5. Spam
- [ ] Send: `YOU WON $1,000,000!!!` / `Click http://free-prize.example now, send your bank password to claim your free prize.` → it moves to the **Spam** tab.

## 6. Settings, email, push
- [ ] **Settings:** turn on Quiet hours (or change any switch) → **Save changes** → toast "Settings saved". Reload: it persisted.
- [ ] **Email:** in Settings → Categories tick **Email** for *Security*, save, then send a test with category *Security* and priority *High*. Email arrives (only to your own Resend account email while using the sandbox sender; check spam). Optional: enable the daily digest.
- [ ] **Push:** Settings → Push → **Enable push on this device** and allow the browser prompt. Tick **Push** for *Security*, save. Switch to another tab or minimize the browser (push is skipped while the app is the focused tab), then send a High *Security* test from another device/tab. A system notification appears; clicking it opens the app.

## 7. Dashboard
- [ ] `APP/dashboard` shows stat cards, four charts, and "Recent high priority".
- [ ] Switch 7 / 30 / 90 days. Send a test: the numbers refresh within a couple of seconds.
- [ ] Demo account (after seeding): sign in as `demo@notify.dev` / `Demo1234!` and the dashboard is full of data. Enabling email, push or digest for it must be refused/ignored.

## 8. Logout
- [ ] User menu → **Log out** → back on the public pages. Back button or `APP/dashboard` redirects to login.

## 9. Third-party cookies blocked
- [ ] Chrome → Settings → Privacy and security → Third-party cookies → **Block third-party cookies**, then repeat step 2 in a fresh window (or use Incognito, which blocks them by default). Login and reload must still work.
- [ ] Also try Firefox or Safari (stricter tracking protection). Because `/api` is proxied under the app's own domain, all must pass.

## 10. Railway logs and Supabase cold starts
- [ ] Railway → your service → **Deployments → View logs** (or the **Logs** tab). Logs are JSON lines. Filter with `@level:error` or search `error`.
- [ ] Look for `"msg":"Health check: database unreachable"` and `503` responses right after a deploy or after the service sat idle. Occasional single 503s on the first request after a long idle are the Supabase pooler warming up; the API retries connects, so users should not see them. Many repeated 503s mean the DB URLs or pool size are wrong.
- [ ] Logs never contain notification text, tokens or secrets. Query strings are not logged.
- [ ] Optional: watch `https://API/api/health` for a few minutes: `while true; do curl -s -o /dev/null -w "%{http_code} %{time_total}s\n" https://API/api/health; sleep 20; done`.

## 11. Lighthouse on the live URLs
- Chrome DevTools: open `APP` in an Incognito window → F12 → **Lighthouse** → Mode *Navigation*, Device *Desktop* (and *Mobile*) → **Analyze page load**. For the dashboard, sign in first and run it on `APP/dashboard` (Incognito with extensions off gives the most faithful result).
- Or with the CLI: `npx lighthouse https://APP --view` (landing). Reference results from the local production build: landing 91 / 100 / 96 / 100, dashboard 88 / 100 / 96 / 100 (performance / accessibility / best practices / SEO).
