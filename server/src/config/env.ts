import 'dotenv/config'
import { z } from 'zod'

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  DATABASE_URL: z.string().min(1, 'is required (Supabase pooled URL)'),
  DIRECT_URL: z.string().min(1, 'is required (Supabase direct URL)'),
  CLIENT_URL: z.string().min(1, 'is required (e.g. http://localhost:5173)'),
  JWT_ACCESS_SECRET: z.string().min(32, 'must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'must be at least 32 characters'),
  ACCESS_TOKEN_TTL_MINUTES: z.coerce.number().int().positive().default(15),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(7),
  DB_POOL_MAX: z.coerce.number().int().positive().default(10),
  // --- AI (all optional: without a key the app uses the rule-based fallback) ---
  GROQ_API_KEY: z.string().trim().optional(),
  GROQ_BASE_URL: z.string().trim().optional(), // override for proxies / local test doubles
  GROQ_MODEL_FAST: z.string().default('openai/gpt-oss-20b'),
  GROQ_MODEL_SMART: z.string().default('openai/gpt-oss-120b'),
  AI_TIMEOUT_MS: z.coerce.number().int().positive().default(4000),
  AI_USER_LIMIT_PER_MIN: z.coerce.number().int().positive().default(20),
  // --- Smart features (all optional: a channel without its keys is simply reported as "not configured") ---
  RESEND_API_KEY: z.string().trim().optional(),
  EMAIL_FROM: z.string().default('Notify <onboarding@resend.dev>'),
  VAPID_PUBLIC_KEY: z.string().trim().optional(),
  VAPID_PRIVATE_KEY: z.string().trim().optional(),
  VAPID_SUBJECT: z.string().default('mailto:admin@example.com'), // must be mailto: or https:
  PUBLIC_API_URL: z.string().trim().optional(), // base URL of this API, used in unsubscribe links
  // Hops of trusted proxies in front of the app (Railway edge = 1; behind a Vercel rewrite as well = 2).
  TRUST_PROXY: z.coerce.number().int().min(0).default(1),
  // 'lax' when the API is reached through the web app's own domain (Vercel rewrite); 'none' only for a cross-site API.
  COOKIE_SAMESITE: z.enum(['lax', 'none']).default('lax'),
  SCHEDULER_ENABLED: z.enum(['true', 'false']).default('true').transform((v) => v === 'true'),
})

const parsed = schema.safeParse(process.env)

if (!parsed.success) {
  console.error('Invalid environment variables:')
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join('.')}: ${issue.message}`)
  }
  console.error('Copy .env.example to .env and fill in the values.')
  process.exit(1)
}

if (parsed.data.JWT_ACCESS_SECRET === parsed.data.JWT_REFRESH_SECRET) {
  console.error('Invalid environment variables:\n  - JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must differ')
  process.exit(1)
}

export const env = parsed.data

/** Origins allowed by CORS and by the cookie-endpoint origin check. */
export const allowedOrigins = env.CLIENT_URL.split(',').map((o) => o.trim())

/** Where the web app lives (links in emails). */
export const appUrl = allowedOrigins[0]
export const publicApiUrl = (env.PUBLIC_API_URL || `http://localhost:${env.PORT}`).replace(/\/$/, '')
export const emailConfigured = !!env.RESEND_API_KEY
export const pushConfigured = !!(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY)



