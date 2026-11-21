import type { Request, Response } from 'express'
import { applyUnsubscribe } from '../services/preferences.service'
import { appUrl } from '../config/env'
import { verifyUnsubscribeToken } from '../utils/unsubscribe'
import { log } from '../utils/logger'

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

const page = (title: string, body: string) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title>
<style>body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#f4f4f5;margin:0;padding:24px;color:#111827}main{max-width:440px;margin:10vh auto;background:#fff;border-radius:12px;padding:28px 24px;box-shadow:0 1px 3px rgba(0,0,0,.08)}h1{font-size:20px;margin:0 0 12px}p{color:#4b5563;line-height:1.5}button,a.btn{display:inline-block;background:#111827;color:#fff;border:0;border-radius:8px;padding:12px 18px;font-size:14px;font-weight:600;cursor:pointer;text-decoration:none}a{color:#111827}</style></head><body><main>${body}</main></body></html>`

const describe = (scope: string) => (scope === 'digest' ? 'the daily digest email' : `${esc(scope.replace('category:', '').toLowerCase())} emails`)

/** GET only shows a confirmation page (mail scanners prefetch links, so GET must not change anything). */
export function unsubscribePage(req: Request, res: Response) {
  const token = String(req.query.token ?? '')
  const v = verifyUnsubscribeToken(token)
  if (!v) return void res.status(400).type('html').send(page('Invalid link', '<h1>This link is not valid</h1><p>It may be incomplete. You can manage your emails in your notification settings.</p>'))
  res.type('html').send(
    page(
      'Unsubscribe',
      `<h1>Unsubscribe?</h1><p>You will stop receiving ${describe(v.scope)}. In-app notifications are not affected.</p><form method="post" action="/api/unsubscribe?token=${encodeURIComponent(token)}"><button type="submit">Confirm unsubscribe</button></form>`,
    ),
  )
}

/** POST performs it: used by the confirmation button and by the one-click List-Unsubscribe header. */
export async function unsubscribe(req: Request, res: Response) {
  const v = verifyUnsubscribeToken(String(req.query.token ?? ''))
  if (!v) return void res.status(400).type('html').send(page('Invalid link', '<h1>This link is not valid</h1>'))
  try {
    if ((await applyUnsubscribe(v.userId, v.scope)) === null) return void res.status(400).type('html').send(page('Invalid link', '<h1>This link is not valid</h1>'))
  } catch (err) {
    log.error('[unsubscribe] failed:', err instanceof Error ? err.message : err)
    return void res.status(500).type('html').send(page('Something went wrong', '<h1>Something went wrong</h1><p>Please try again later or change this in your notification settings.</p>'))
  }
  res.type('html').send(page('Unsubscribed', `<h1>You are unsubscribed</h1><p>You will no longer receive ${describe(v.scope)}.</p><a class="btn" href="${esc(appUrl)}/settings">Manage notification settings</a>`))
}
