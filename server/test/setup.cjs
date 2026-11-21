// Preloaded by `npm test`: env.ts validates process.env on import, so give it harmless defaults.
// DB-backed tests only run when TEST_DATABASE_URL is set (they must point at a throwaway database).
if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL
  process.env.DIRECT_URL = process.env.TEST_DATABASE_URL
}
process.env.DATABASE_URL ||= 'postgresql://u:p@localhost:5432/db'
process.env.DIRECT_URL ||= 'postgresql://u:p@localhost:5432/db'
process.env.CLIENT_URL ||= 'http://localhost:5173'
process.env.JWT_ACCESS_SECRET ||= 'a'.repeat(40)
process.env.JWT_REFRESH_SECRET ||= 'b'.repeat(40)
process.env.SCHEDULER_ENABLED = 'false'
for (const k of ['GROQ_API_KEY', 'RESEND_API_KEY', 'VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY']) delete process.env[k] // tests must never call real services
