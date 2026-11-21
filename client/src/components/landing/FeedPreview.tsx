import { Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { Category, Priority } from '@/api/notifications'
import { Badge } from '@/components/ui/badge'
import { CATEGORY_META, PRIORITY_META } from '@/lib/notificationMeta'

interface Sample {
  title: string
  message: string
  category: Category
  priority: Priority
  reason: string
}

const SAMPLES: Sample[] = [
  { title: 'Payment failed', message: 'Your card was declined for order #48213.', category: 'ORDER', priority: 'HIGH', reason: 'Money is at risk and needs action' },
  { title: 'New sign-in from Chrome', message: 'If this was not you, reset your password.', category: 'SECURITY', priority: 'HIGH', reason: 'Possible account takeover' },
  { title: 'Maya liked your post', message: 'Maya and 3 others liked "Shipping my side project".', category: 'SOCIAL', priority: 'LOW', reason: 'Nice to know, not urgent' },
  { title: 'Standup in 15 minutes', message: 'Daily standup starts at 10:00.', category: 'REMINDER', priority: 'MEDIUM', reason: 'Time-sensitive, soon' },
  { title: 'Weekend sale: 40% off', message: 'Limited stock, ends Sunday.', category: 'PROMOTION', priority: 'LOW', reason: 'Promotional content' },
  { title: 'Order #48101 shipped', message: 'Arrives in 2 days. Track it anytime.', category: 'ORDER', priority: 'MEDIUM', reason: 'Useful status update' },
]

const VISIBLE = 4
const prefersReduced = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Self-playing, fake-live notification feed for the hero. Static when reduced motion is requested. */
export function FeedPreview() {
  const [tick, setTick] = useState(VISIBLE)

  useEffect(() => {
    if (prefersReduced()) return
    const id = setInterval(() => setTick((t) => t + 1), 2600)
    return () => clearInterval(id)
  }, [])

  const items = Array.from({ length: VISIBLE }, (_, i) => ({ n: tick - i, s: SAMPLES[(tick - i) % SAMPLES.length] }))

  return (
    <div className="relative mx-auto w-full max-w-md" role="img" aria-label="Preview of the Notify inbox: notifications arrive, get a priority from the AI and are sorted automatically.">
      <div aria-hidden className="absolute -inset-6 -z-10 rounded-[2rem] bg-gradient-to-tr from-primary/20 via-chart-5/15 to-chart-4/20 blur-2xl" />
      <div aria-hidden className="float-y relative rounded-2xl border bg-card p-3 shadow-soft">
        <div className="mb-2 flex items-center justify-between px-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5 font-medium text-foreground">
            <span className="size-2 rounded-full bg-success motion-safe:animate-pulse" />
            Live inbox
          </span>
          <span>Sorted by AI</span>
        </div>
        <ul className="space-y-2">
          {items.map(({ n, s }, i) => {
            const Icon = CATEGORY_META[s.category].icon
            return (
              <li key={n} className={`${i === 0 ? 'feed-in' : ''} flex gap-3 rounded-xl border p-3 ${i === 0 ? 'bg-accent/60' : 'bg-card'}`}>
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold">{s.title}</p>
                    <Badge variant={PRIORITY_META[s.priority].variant}>
                      <Sparkles className="size-3" />
                      {PRIORITY_META[s.priority].label}
                    </Badge>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{s.message}</p>
                  <p className="mt-1 text-[11px] text-primary">AI: {s.reason}</p>
                </div>
              </li>
            )
          })}
        </ul>
        <div className="pointer-events-none absolute inset-x-3 bottom-3 h-16 rounded-b-xl bg-gradient-to-t from-card to-transparent" />
      </div>
    </div>
  )
}
