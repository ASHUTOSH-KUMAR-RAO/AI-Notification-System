import type { ReactNode } from 'react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { Overview } from '@/api/analytics'
import { PRIORITIES } from '@/api/notifications'
import { Stagger } from '@/components/motion/Stagger'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { pct } from '@/lib/format'
import { CATEGORY_META, PRIORITY_META } from '@/lib/notificationMeta'

const PRIORITY_COLOR = { HIGH: 'var(--chart-4)', MEDIUM: 'var(--chart-1)', LOW: 'var(--chart-2)' } as const
const CATEGORY_COLOR = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-4)', 'var(--chart-5)', 'var(--chart-3)', 'var(--chart-1)']
const AXIS = { fontSize: 12, fill: 'var(--muted-foreground)' }
const CHANNEL_LABEL = { IN_APP: 'In-app', EMAIL: 'Email', PUSH: 'Push' } as const

function ChartCard({ title, description, summary, children }: { title: string; description: string; summary: string; children: ReactNode }) {
  return (
    <Stagger className="min-w-0 *:h-full">
    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div role="img" aria-label={`${title}. ${summary}`} className="h-64 w-full">
          {children}
        </div>
      </CardContent>
    </Card>
    </Stagger>
  )
}

interface TipProps {
  active?: boolean
  label?: string | number
  payload?: { name?: string | number; value?: number | string; color?: string; dataKey?: string | number }[]
  formatValue?: (v: number | string) => string
  formatLabel?: (l: string) => string
}

function Tip({ active, label, payload, formatValue, formatLabel }: TipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border bg-popover px-3.5 py-2.5 text-xs text-popover-foreground shadow-md">
      {label != null && <p className="mb-1 font-medium">{formatLabel ? formatLabel(String(label)) : label}</p>}
      {payload.map((p) => (
        <p key={String(p.dataKey ?? p.name)} className="flex items-center gap-2">
          <span aria-hidden className="size-2 rounded-full" style={{ background: p.color }} />
          <span className="text-muted-foreground">{p.name}</span>
          <span className="ml-auto pl-3 font-medium tabular-nums">{formatValue ? formatValue(p.value ?? 0) : p.value}</span>
        </p>
      ))}
    </div>
  )
}

const shortDate = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

export function OverTimeChart({ data }: { data: Overview['overTime'] }) {
  const total = data.reduce((a, d) => a + d.HIGH + d.MEDIUM + d.LOW, 0)
  return (
    <ChartCard title="Notifications over time" description="Daily volume, stacked by priority" summary={`${total} notifications over ${data.length} days.`}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey="date" tickFormatter={shortDate} tick={AXIS} tickLine={false} axisLine={false} minTickGap={32} />
          <YAxis allowDecimals={false} tick={AXIS} tickLine={false} axisLine={false} />
          <Tooltip content={<Tip formatLabel={shortDate} />} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
          {[...PRIORITIES].reverse().map((p) => (
            <Area key={p} type="monotone" dataKey={p} name={PRIORITY_META[p].label} stackId="1" stroke={PRIORITY_COLOR[p]} fill={PRIORITY_COLOR[p]} fillOpacity={0.35} strokeWidth={2} />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

export function CategoryChart({ data }: { data: Overview['categories'] }) {
  const rows = data.map((d, i) => ({ ...d, name: CATEGORY_META[d.category].label, fill: CATEGORY_COLOR[i] })).sort((a, b) => b.count - a.count)
  return (
    <ChartCard title="By category" description="Where your notifications come from" summary={rows.map((r) => `${r.name} ${r.count}`).join(', ')}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
          <CartesianGrid horizontal={false} stroke="var(--border)" />
          <XAxis type="number" allowDecimals={false} tick={AXIS} tickLine={false} axisLine={false} />
          <YAxis type="category" dataKey="name" tick={AXIS} tickLine={false} axisLine={false} width={80} />
          <Tooltip cursor={{ fill: 'var(--muted)' }} content={<Tip />} />
          <Bar dataKey="count" name="Notifications" radius={[0, 6, 6, 0]} maxBarSize={22}>
            {rows.map((r) => (
              <Cell key={r.category} fill={r.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

export function DeliveryChart({ data }: { data: Overview['delivery'] }) {
  const rows = data.map((d) => ({ ...d, name: CHANNEL_LABEL[d.channel] }))
  return (
    <ChartCard
      title="Delivery by channel"
      description="Sent, failed and skipped (by your preferences)"
      summary={rows.map((r) => `${r.name}: ${r.sent} sent, ${r.failed} failed, ${r.skipped} skipped${r.successRate != null ? `, ${pct(r.successRate)} success` : ''}`).join('. ')}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey="name" tick={AXIS} tickLine={false} axisLine={false} />
          <YAxis allowDecimals={false} tick={AXIS} tickLine={false} axisLine={false} />
          <Tooltip cursor={{ fill: 'var(--muted)' }} content={<Tip />} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="sent" name="Sent" stackId="d" fill="var(--success)" maxBarSize={48} />
          <Bar dataKey="failed" name="Failed" stackId="d" fill="var(--chart-4)" maxBarSize={48} />
          <Bar dataKey="skipped" name="Skipped" stackId="d" fill="var(--muted-foreground)" fillOpacity={0.4} radius={[6, 6, 0, 0]} maxBarSize={48} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

export function EngagementChart({ data }: { data: Overview['engagement'] }) {
  const rows = data.map((d) => ({ ...d, name: CATEGORY_META[d.category].label, value: Math.round(d.score * 100) }))
  return (
    <ChartCard title="Engagement by category" description="How readily you open each kind (0-100)" summary={rows.map((r) => `${r.name} ${r.value}`).join(', ')}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey="name" tick={AXIS} tickLine={false} axisLine={false} interval={0} angle={-35} textAnchor="end" height={52} />
          <YAxis domain={[0, 100]} tick={AXIS} tickLine={false} axisLine={false} />
          <Tooltip cursor={{ fill: 'var(--muted)' }} content={<Tip formatValue={(v) => `${v} / 100`} />} />
          <Bar dataKey="value" name="Engagement" fill="var(--chart-1)" radius={[6, 6, 0, 0]} maxBarSize={40} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
