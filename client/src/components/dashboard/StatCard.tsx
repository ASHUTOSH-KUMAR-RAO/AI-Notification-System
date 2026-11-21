import { ArrowDownRight, ArrowUpRight, Minus, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { AnimatedNumber } from '@/components/AnimatedNumber'
import { Stagger } from '@/components/motion/Stagger'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export interface Trend {
  /** Fractional change (0.12 = +12%) or percentage-point change for rates; null = no previous data. */
  delta: number | null
  /** Which direction is an improvement. */
  better: 'up' | 'down' | 'neutral'
  unit?: 'pct' | 'pp'
}

function TrendBadge({ delta, better, unit = 'pct' }: Trend) {
  if (delta == null) return <span className="text-xs text-muted-foreground">New this period</span>
  const flat = Math.abs(delta) < 0.005
  const up = delta > 0
  const good = flat || better === 'neutral' ? null : (up && better === 'up') || (!up && better === 'down')
  const Icon = flat ? Minus : up ? ArrowUpRight : ArrowDownRight
  const text = `${up ? '+' : ''}${(delta * 100).toFixed(unit === 'pp' ? 1 : 0)}${unit === 'pp' ? ' pp' : '%'}`
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-medium',
        good === true && 'bg-success/15 text-success',
        good === false && 'bg-destructive/10 text-destructive',
        good === null && 'bg-muted text-muted-foreground',
      )}
    >
      <Icon className="size-3" aria-hidden />
      {text}
      <span className="sr-only"> {flat ? 'no change' : up ? 'increase' : 'decrease'} versus previous period</span>
    </span>
  )
}

interface Props {
  label: string
  icon: LucideIcon
  value: number
  format?: (n: number) => string
  trend?: Trend
  footer?: ReactNode
}

export function StatCard({ label, icon: Icon, value, format, trend, footer }: Props) {
  return (
    <Stagger className="min-w-0 *:h-full">
    <Card className="shadow-soft gap-3 p-4 transition-transform motion-safe:hover:-translate-y-0.5 sm:p-5">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{label}</span>
        <Icon className="size-4" aria-hidden />
      </div>
      <p className="text-2xl font-semibold sm:text-3xl tracking-tight tabular-nums">
        <AnimatedNumber value={value} format={format} />
      </p>
      <div className="flex min-h-5 items-center gap-2 text-xs text-muted-foreground">
        {trend && <TrendBadge {...trend} />}
        {footer}
      </div>
    </Card>
    </Stagger>
  )
}
