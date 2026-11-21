import { AlertTriangle, ArrowRight, BarChart3, Clock, Inbox, MailOpen, ShieldAlert, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { Overview, Range } from '@/api/analytics'
import { EmptyState } from '@/components/EmptyState'
import { Seo } from '@/components/Seo'
import { StatCard } from '@/components/dashboard/StatCard'
import { CategoryChart, DeliveryChart, EngagementChart, OverTimeChart } from '@/components/dashboard/charts'
import { SendTestDialog } from '@/components/notifications/SendTestDialog'
import { PriorityBadge } from '@/components/notifications/PriorityBadge'
import { Stagger, StaggerGroup } from '@/components/motion/Stagger'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/context/AuthContext'
import { useOverview } from '@/hooks/useAnalytics'
import { change, formatDuration, pct } from '@/lib/format'
import { CATEGORY_META } from '@/lib/notificationMeta'
import { timeAgo } from '@/lib/time'

const RANGES: { value: Range; label: string; long: string }[] = [
  { value: '7d', label: '7 days', long: 'last 7 days' },
  { value: '30d', label: '30 days', long: 'last 30 days' },
  { value: '90d', label: '90 days', long: 'last 90 days' },
]

function greeting() {
  const h = new Date().getHours()
  return h < 5 ? 'Working late' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

function Stats({ data }: { data: Overview }) {
  const { current: c, previous: p } = data
  const analyzedShare = c.total ? c.aiAnalyzed / c.total : 0
  return (
    <section aria-label="Key numbers" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
      <StatCard label="Total notifications" icon={Inbox} value={c.total} trend={{ delta: change(c.total, p.total), better: 'neutral' }} />
      <StatCard label="Unread" icon={MailOpen} value={c.unread} trend={{ delta: change(c.unread, p.unread), better: 'down' }} />
      <StatCard label="Read rate" icon={BarChart3} value={c.readRate * 100} format={(n) => `${n.toFixed(0)}%`} trend={{ delta: p.total ? c.readRate - p.readRate : null, better: 'up', unit: 'pp' }} />
      <StatCard
        label="Avg time to open"
        icon={Clock}
        value={c.avgTimeToOpenMs ?? 0}
        format={(n) => (c.avgTimeToOpenMs == null ? '–' : formatDuration(n))}
        trend={{ delta: c.avgTimeToOpenMs != null && p.avgTimeToOpenMs != null ? change(c.avgTimeToOpenMs, p.avgTimeToOpenMs) : null, better: 'down' }}
      />
      <StatCard label="Spam blocked" icon={ShieldAlert} value={c.spam} trend={{ delta: change(c.spam, p.spam), better: 'neutral' }} />
      <StatCard
        label="AI analyzed"
        icon={Sparkles}
        value={c.aiAnalyzed}
        footer={
          <span>
            {pct(analyzedShare)} AI · {c.aiFallback} basic rules
          </span>
        }
      />
    </section>
  )
}

function RecentHigh({ items }: { items: Overview['recentHigh'] }) {
  return (
    <Stagger className="min-w-0 *:h-full">
    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle>Recent high priority</CardTitle>
        <CardDescription>The latest things that needed your attention</CardDescription>
      </CardHeader>
      <CardContent className="space-y-1">
        {items.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Nothing urgent. Nice and quiet.</p>
        ) : (
          <ul className="divide-y divide-border/60">
            {items.map((n) => {
              const Icon = CATEGORY_META[n.category].icon
              return (
                <li key={n.id} className="flex items-center gap-3 py-3">
                  <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">{n.title}</span>
                      {!n.isRead && <span className="size-2 shrink-0 rounded-full bg-primary" role="img" aria-label="Unread" />}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {CATEGORY_META[n.category].label} · <time dateTime={n.createdAt}>{timeAgo(n.createdAt)}</time>
                    </p>
                  </div>
                  <PriorityBadge n={n} />
                </li>
              )
            })}
          </ul>
        )}
        <Link to="/notifications" className={buttonVariants({ variant: 'outline', size: 'sm', className: 'mt-2 w-full' })}>
          View inbox <ArrowRight className="size-4" aria-hidden />
        </Link>
      </CardContent>
    </Card>
    </Stagger>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading dashboard">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-36 rounded-3xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-80 rounded-3xl" />
        ))}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const [range, setRange] = useState<Range>('30d')
  const { data, isPending, isError, refetch, isFetching } = useOverview(range)
  if (!user) return null

  const label = RANGES.find((r) => r.value === range)!.long
  const empty = data && data.current.total === 0 && data.previous.total === 0 && data.recentHigh.length === 0

  return (
    <div className="space-y-6">
      <Seo title="Dashboard" description="Your notification analytics: volume, read rate, delivery and engagement." />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {greeting()}, {user.name.split(' ')[0]}
          </h1>
          <p className="text-sm text-muted-foreground">
            {data ? `Here is how your notifications did in the ${label}.` : 'Loading your analytics...'}
          </p>
        </div>
        <Tabs value={range} onValueChange={(v) => setRange(v as Range)}>
          <TabsList aria-label="Date range">
            {RANGES.map((r) => (
              <TabsTrigger key={r.value} value={r.value}>
                {r.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {isPending ? (
        <DashboardSkeleton />
      ) : isError ? (
        <Card role="alert">
          <EmptyState icon={AlertTriangle} title="We could not load your analytics" description="Check your connection and try again.">
            <Button onClick={() => void refetch()} disabled={isFetching}>
              Retry
            </Button>
          </EmptyState>
        </Card>
      ) : empty ? (
        <Card>
          <EmptyState icon={Inbox} title="Nothing to analyze yet" description="Send yourself a test notification and watch the charts come to life.">
            <SendTestDialog />
          </EmptyState>
        </Card>
      ) : (
        <StaggerGroup className={isFetching ? 'space-y-6 opacity-90 transition-opacity' : 'space-y-6 transition-opacity'} aria-busy={isFetching}>
          <Stats data={data} />
          <OverTimeChart data={data.overTime} />
          <div className="grid gap-4 lg:grid-cols-2">
            <CategoryChart data={data.categories} />
            <DeliveryChart data={data.delivery} />
            <EngagementChart data={data.engagement} />
            <RecentHigh items={data.recentHigh} />
          </div>
        </StaggerGroup>
      )}
    </div>
  )
}
