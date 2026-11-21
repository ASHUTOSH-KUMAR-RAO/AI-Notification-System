# Deploying Notify

Architecture: **Vercel** (static client + `/api/*` rewrite) → **Railway** (Express API + Socket.io + cron) → **Supabase** (Postgres, Tokyo).

Railway has no Tokyo region. The closest Asia region is **Southeast Asia (Singapore)**, about 70 ms from Tokyo, which is fine.

Do the steps in order: Railway first (you need its URL), then Vercel, then update the cross-references.

## 0. Before you start

1. Push the repo to GitHub (done by the setup) and make sure CI is green.
2. Generate **new production JWT secrets** (do not reuse the dev ones). Run twice and keep both values:
   ```bash
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```
3. Have your `server/.env` open to copy values from.

## 1. Railway (backend)

1. Open https://railway.com and sign in with your **personal** account. Check the workspace name at the top left is your personal one.
2. **New Project → Deploy from GitHub repo →** pick `ASHUTOSH-KUMAR-RAO/AI-Notification-System` (authorize the Railway GitHub app for that repo if asked).
3. Railway creates a service. Open it → **Settings**:
   - **Source → Root Directory:** `server`
   - **Config-as-code → Railway Config File:** `/server/railway.json` (this sets build command, pre-deploy migration, start command, health check)
   - If you prefer manual settings instead: Build command `npm run build`, Pre-deploy command `npm run prisma:deploy`, Start command `node dist/server.js`, Healthcheck path `/api/health`, Healthcheck timeout `120`.
   - **Deploy → Region:** choose **Southeast Asia (Singapore)**.
   - **Restart policy:** On failure, 5 retries.
4. Open **Variables → Raw Editor** and add the variables from the Railway table below (the first deploy can start before `CLIENT_URL` and `PUBLIC_API_URL` are known; use temporary values and fix them in step 4).
5. **Settings → Networking → Generate Domain.** Keep the port Railway suggests (it injects `PORT`). Copy the URL, for example `https://notify-server-production.up.railway.app`.
6. Open **Deployments** and wait for **Active**. Check `https://<railway-url>/api/health`. You should see `"database":"connected"`.

## 2. Vercel (frontend)

1. Edit `client/vercel.json` in your repo: replace `YOUR-RAILWAY-DOMAIN.up.railway.app` in the first rewrite with your Railway domain (no `https://`, keep the rest). Commit and push to `main`.
2. Open https://vercel.com, make sure the **personal** account (Hobby) is selected in the top-left switcher.
3. **Add New → Project → Import Git Repository →** `AI-Notification-System`.
4. Configure:
   - **Framework Preset:** Vite
   - **Root Directory:** `client`
   - Build command `npm run build`, output `dist` (the defaults)
5. **Environment Variables** (see the Vercel table), then **Deploy**.
6. Copy the production URL, for example `https://ai-notification-system.vercel.app`.

## 3. Cross-reference the two (important)

1. Railway → service → **Variables:** set
   - `CLIENT_URL` = your Vercel URL (no trailing slash). Several origins can be comma separated.
   - `PUBLIC_API_URL` = your Railway URL.
   Railway redeploys automatically.
2. Vercel → project → **Settings → Environment Variables:** set `VITE_SOCKET_URL` = your Railway URL (if you did not before), then **Deployments → ⋯ → Redeploy**. The Open Graph image URL is filled in automatically from the Vercel production domain at build time.
3. Re-check: `https://<vercel-url>/api/health` must return the same JSON as the Railway URL. That proves the rewrite works.

## 4. Seed the demo account (optional, once)

Seeding writes to the database in your local `server/.env` (Supabase), so no Railway access is needed. From `server/` in PowerShell:

```powershell
$env:NODE_ENV = 'production'
npm run seed:demo -- --force
Remove-Item Env:NODE_ENV
```

It deletes and recreates only `demo@notify.dev`; no other account is touched (including your own test account). The demo account cannot enable email, push or digest (blocked in the server), and all rate limits still apply. It prints the demo credentials at the end.

## Environment variables

### Railway (server): names and where the value comes from

| Name | Value |
|---|---|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | copy from `server/.env` (pooled, port 6543) |
| `DIRECT_URL` | copy from `server/.env` (direct, port 5432) |
| `DB_POOL_MAX` | `5` |
| `CLIENT_URL` | your Vercel URL |
| `PUBLIC_API_URL` | your Railway URL |
| `TRUST_PROXY` | `2` (Vercel rewrite + Railway edge) |
| `COOKIE_SAMESITE` | `lax` |
| `JWT_ACCESS_SECRET` | **new** random value from step 0 |
| `JWT_REFRESH_SECRET` | **new**, different random value from step 0 |
| `GROQ_API_KEY` | copy from `server/.env` |
| `RESEND_API_KEY` | copy from `server/.env` |
| `EMAIL_FROM` | `Notify <onboarding@resend.dev>` (sandbox sender: Resend only delivers to your own Resend account email until you verify a domain) |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | copy from `server/.env` |
| `SCHEDULER_ENABLED` | `true` |

Do **not** set `PORT` (Railway provides it). The model names, AI limits and token lifetimes have good defaults.

### Vercel (client)

| Name | Value |
|---|---|
| `VITE_API_URL` | `/api` |
| `VITE_SOCKET_URL` | your Railway URL |

## Why these choices

- **Cookies:** the browser only ever talks to the Vercel domain for `/api/*`, so the refresh cookie is first-party. `SameSite=Lax` works and third-party-cookie blocking cannot break login.
- **`TRUST_PROXY=2`:** the API sees the request after two proxies (Vercel, then Railway). With 1 it would treat Vercel's IP as the client and rate-limit all users together.
- **Rewrites and long calls:** Vercel rewrites time out after about 30 s; all API calls here finish in seconds.
- **Socket.io direct to Railway:** WebSockets cannot go through Vercel rewrites; the socket authenticates with the access token, so cookies are not needed.
- **Preview deployments:** other Vercel preview URLs are not in `CLIENT_URL`, so CORS rejects them. Add them (comma separated) if you want to test previews.
- **Supabase cold starts:** the API retries failed connects, and the health check retries once, so a cold pooler does not fail a deploy.

## Rollback

Railway → Deployments → pick the last good one → **Rollback**. Vercel → Deployments → ⋯ → **Promote to Production**. Migrations are additive and forward-only; do not roll the database back.
