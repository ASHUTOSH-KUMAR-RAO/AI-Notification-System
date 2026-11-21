import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { defineConfig } from 'vite'

// Open Graph images must be absolute URLs. Vercel exposes the production domain at build time; set VITE_SITE_URL to override.
const siteUrl = (process.env.VITE_SITE_URL ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '')).replace(/\/$/, '')

export default defineConfig({
  plugins: [react(), tailwindcss(), { name: 'site-url', transformIndexHtml: (html: string) => html.replaceAll('%SITE_URL%', siteUrl) }],
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
})
