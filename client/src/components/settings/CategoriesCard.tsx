import { Mail, Smartphone, Bell } from 'lucide-react'
import { CATEGORIES } from '@/api/notifications'
import type { Preferences } from '@/api/preferences'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { CATEGORY_META } from '@/lib/notificationMeta'
import { cn } from '@/lib/utils'

interface Props {
  prefs: Preferences
  emailConfigured: boolean
  pushConfigured: boolean
  onChange: (update: (p: Preferences) => void) => void
}

const CHANNELS = [
  { key: 'inApp', label: 'In-app', icon: Bell },
  { key: 'email', label: 'Email', icon: Mail },
  { key: 'push', label: 'Push', icon: Smartphone },
] as const

export function CategoriesCard({ prefs, emailConfigured, pushConfigured, onChange }: Props) {
  const available = { inApp: true, email: emailConfigured, push: pushConfigured }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Categories</CardTitle>
        <CardDescription>
          Mute a category to silence its alerts, or pick where each one reaches you. Muted notifications still appear in your inbox.
          Instant emails are sent for high-priority notifications only; the rest can go in the daily digest.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {CATEGORIES.map((c) => {
          const { icon: Icon, label } = CATEGORY_META[c]
          const pref = prefs.categories[c]
          return (
            <fieldset key={c} className={cn('rounded-lg border p-3 transition-opacity', !pref.enabled && 'opacity-60')}>
              <legend className="sr-only">{label} notifications</legend>
              <div className="flex items-center justify-between gap-3">
                <label htmlFor={`cat-${c}`} className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                  <Icon className="size-4 text-muted-foreground" aria-hidden />
                  {label}
                </label>
                <Switch
                  id={`cat-${c}`}
                  checked={pref.enabled}
                  onCheckedChange={(on) => onChange((p) => void (p.categories[c].enabled = on))}
                  aria-label={`${label} notifications enabled`}
                />
              </div>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
                {CHANNELS.map(({ key, label: chLabel, icon: ChIcon }) => {
                  const unavailable = !available[key]
                  const id = `cat-${c}-${key}`
                  return (
                    <label
                      key={key}
                      htmlFor={id}
                      className={cn('flex items-center gap-2 text-sm', (!pref.enabled || unavailable) && 'cursor-not-allowed text-muted-foreground')}
                      title={unavailable ? `${chLabel} is not configured on this server` : undefined}
                    >
                      <Checkbox
                        id={id}
                        checked={pref.channels[key] && !unavailable}
                        disabled={!pref.enabled || unavailable}
                        onCheckedChange={(on) => onChange((p) => void (p.categories[c].channels[key] = on === true))}
                      />
                      <ChIcon className="size-3.5" aria-hidden />
                      {chLabel}
                      {unavailable && <span className="text-xs">(not configured)</span>}
                    </label>
                  )
                })}
              </div>
            </fieldset>
          )
        })}
      </CardContent>
    </Card>
  )
}
