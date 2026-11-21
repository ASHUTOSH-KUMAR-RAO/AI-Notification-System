import { AlertTriangle, Loader2, RotateCcw } from 'lucide-react'
import { Seo } from '@/components/Seo'
import { useState } from 'react'
import type { Preferences } from '@/api/preferences'
import { CategoriesCard } from '@/components/settings/CategoriesCard'
import { DigestCard } from '@/components/settings/DigestCard'
import { PriorityCard } from '@/components/settings/PriorityCard'
import { PushCard } from '@/components/settings/PushCard'
import { QuietHoursCard } from '@/components/settings/QuietHoursCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { usePreferences, useSavePreferences } from '@/hooks/usePreferences'

/**
 * Explicit "Save changes" bar instead of auto-save: time pickers and many small toggles produce half-finished
 * intermediate values (a quiet-hours end of 07:0_ while typing), and a time-zone change should be applied together
 * with the times it affects. One save = one atomic, validated update, with a clear way to discard.
 */
export default function Settings() {
  const { data, isPending, isError, error, refetch } = usePreferences()
  const save = useSavePreferences()
  const [draft, setDraft] = useState<Preferences | null>(null)

  if (isPending) {
    return (
      <section className="space-y-6" aria-busy aria-label="Loading settings">
        <Skeleton className="h-9 w-48" />
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-40 w-full rounded-xl" />
        ))}
      </section>
    )
  }
  if (isError) {
    return (
      <div role="alert" className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
        <AlertTriangle className="size-8 text-destructive" aria-hidden />
        <div>
          <p className="font-medium">Couldn't load your settings</p>
          <p className="text-sm text-muted-foreground">{error.message}</p>
        </div>
        <Button onClick={() => void refetch()}>Try again</Button>
      </div>
    )
  }

  const prefs = draft ?? data.preferences
  const dirty = draft !== null && JSON.stringify(draft) !== JSON.stringify(data.preferences)
  const change = (update: (p: Preferences) => void) =>
    setDraft((d) => {
      const next = structuredClone(d ?? data.preferences)
      update(next)
      return next
    })

  return (
    <section className="space-y-6 pb-24">
      <Seo title="Settings" description="Channels, quiet hours, digest and priority preferences." />
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Notification settings</h1>
        <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          Choose what reaches you, where and when.
          <Badge variant={data.channels.email.configured ? 'secondary' : 'outline'}>Email {data.channels.email.configured ? 'ready' : 'not configured'}</Badge>
          <Badge variant={data.channels.push.configured ? 'secondary' : 'outline'}>Push {data.channels.push.configured ? 'ready' : 'not configured'}</Badge>
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <CategoriesCard prefs={prefs} emailConfigured={data.channels.email.configured} pushConfigured={data.channels.push.configured} onChange={change} />
        </div>
        <div className="space-y-6">
          <PriorityCard prefs={prefs} onChange={change} />
          <QuietHoursCard prefs={prefs} onChange={change} />
          <DigestCard prefs={prefs} emailConfigured={data.channels.email.configured} onChange={change} />
          <PushCard />
        </div>
      </div>

      {dirty && (
        <div role="region" aria-label="Unsaved changes" className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 backdrop-blur animate-in slide-in-from-bottom-4 duration-200">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <p className="text-sm font-medium">You have unsaved changes</p>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setDraft(null)} disabled={save.isPending}>
                <RotateCcw className="size-4" aria-hidden />
                Discard
              </Button>
              <Button onClick={() => save.mutate(prefs, { onSuccess: () => setDraft(null) })} disabled={save.isPending}>
                {save.isPending && <Loader2 className="size-4 animate-spin" aria-hidden />}
                {save.isPending ? 'Saving...' : 'Save changes'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
