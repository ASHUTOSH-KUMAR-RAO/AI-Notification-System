import 'dotenv/config'
import { defineConfig } from 'prisma/config'

// Migrations use the direct (non-pooled) connection. Falls back to '' so `prisma generate` works without env.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: { url: process.env.DIRECT_URL ?? '' },
})
