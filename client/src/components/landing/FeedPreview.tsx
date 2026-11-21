import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useMotionScale } from '@/lib/motion'
import { MailCheck, ShieldAlert, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { Category, Priority } from '@/api/notifications'
import { Badge } from '@/components/ui/badge'
import { CATEGORY_META, PRIORITY_META } from '@/lib/notificationMeta'
import { cn } from '@/lib/utils'

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

/** Self-playing, fake-live notification feed for the hero. Slower and shorter-travel under reduced motion. */
export function FeedPreview({ className }: { className?: string }) {
  const [tick, setTick] = useState(VISIBLE)
  const reduce = useReducedMotion()
  const k = useMotionScale()

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), reduce ? 3800 : 2600)
    return () => clearInterval(id)
  }, [reduce])

  const items = Array.from({ length: VISIBLE }, (_, i) => ({ n: tick - i, s: SAMPLES[(tick - i) % SAMPLES.length] }))

  return (
    <div className={cn('relative mx-auto w-full max-w-md', className)} role="img" aria-label="Preview of the Notify inbox: notifications arrive, get a priority from the AI and are sorted automatically.">
      <div aria-hidden className="absolute -inset-3 -z-10 sm:-inset-6 rounded-[2rem] bg-foreground/5 blur-2xl" />
      <div aria-hidden className="float-y relative rounded-3xl border glass p-3 shadow-soft sm:p-4">
        <div className="mb-3 flex items-center justify-between px-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5 font-medium text-foreground">
            <span className="size-2 rounded-full bg-success animate-pulse" />
            Live inbox
          </span>
          <span>Sorted by AI</span>
        </div>
        <ul className="space-y-2.5">
          <AnimatePresence initial={false} mode="popLayout">
          {items.map(({ n, s }, i) => {
            const Icon = CATEGORY_META[s.category].icon
            return (
              <motion.li
                key={n}
                layout
                initial={{ opacity: 0, y: -18 * k, scale: 1 - 0.03 * k }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 1 - 0.05 * k }}
                transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                className={`flex gap-3 rounded-2xl border p-3 ${i === 0 ? 'bg-muted/70' : 'bg-card/70'}`}
              >
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
              </motion.li>
            )
          })}
          </AnimatePresence>
        </ul>
        <div className="pointer-events-none absolute inset-x-3 bottom-3 h-16 rounded-b-2xl bg-gradient-to-t from-background/70 to-transparent" />
      </div>
      <span aria-hidden className="float-y glass absolute -top-4 -right-2 hidden items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium shadow-soft sm:flex" style={{ animationDelay: '-2s' }}>
        <ShieldAlert className="size-3.5 text-destructive" /> Spam blocked
      </span>
      <span aria-hidden className="float-y glass absolute -bottom-4 -left-3 hidden items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium shadow-soft sm:flex" style={{ animationDelay: '-4s' }}>
        <MailCheck className="size-3.5 text-primary" /> Email delivered
      </span>
    </div>
  )
}
