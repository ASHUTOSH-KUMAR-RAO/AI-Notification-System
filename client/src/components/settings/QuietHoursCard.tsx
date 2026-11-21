import { Moon } from 'lucide-react'
import { useMemo } from 'react'
import type { Preferences } from '@/api/preferences'
import { SimpleSelect } from '@/components/SimpleSelect'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

const detectZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone

export function TimeZoneField({ value, onChange }: { value: string; onChange: (tz: string) => void }) {
  const options = useMemo(() => {
    const zones = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : []
    const all = zones.includes(value) ? zones : [value, ...zones]
    return all.includes('UTC') ? all : ['UTC', ...all]
  }, [value])
  const detected = detectZone()

  return (
    <div className="space-y-2">
      <Label htmlFor="timezone">Time zone</Label>
      <div className="flex flex-wrap items-center gap-2">
        <SimpleSelect id="timezone" className="w-full sm:w-72" value={value} onChange={onChange} options={options.map((z) => ({ value: z, label: z.replace(/_/g, ' ') }))} aria-label="Time zone" />
        {detected !== value && (
          <Button type="button" variant="outline" size="sm" onClick={() => onChange(detected)}>
            Use my time zone ({detected.replace(/_/g, ' ')})
          </Button>
        )}
      </div>
    </div>
  )
}

export function QuietHoursCard({ prefs, onChange }: { prefs: Preferences; onChange: (u: (p: Preferences) => void) => void }) {
  const off = !prefs.quietHoursEnabled
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Moon className="size-4" aria-hidden />
          Quiet hours
        </CardTitle>
        <CardDescription>
          No pop-ups during this window. Push and email are held and delivered when it ends. Times use your time zone below.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="quiet-enabled">Turn on quiet hours</Label>
          <Switch id="quiet-enabled" checked={prefs.quietHoursEnabled} onCheckedChange={(on) => onChange((p) => void (p.quietHoursEnabled = on))} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="quiet-start">From</Label>
            <Input id="quiet-start" type="time" value={prefs.quietStart} disabled={off} onChange={(e) => e.target.value && onChange((p) => void (p.quietStart = e.target.value))} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="quiet-end">Until</Label>
            <Input id="quiet-end" type="time" value={prefs.quietEnd} disabled={off} onChange={(e) => e.target.value && onChange((p) => void (p.quietEnd = e.target.value))} />
          </div>
        </div>

        <TimeZoneField value={prefs.timeZone} onChange={(tz) => onChange((p) => void (p.timeZone = tz))} />

        <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
          <div className="text-sm">
            <Label htmlFor="quiet-high" className="font-medium">
              Let high-priority through
            </Label>
            <p className="text-muted-foreground">Urgent notifications still alert you during quiet hours.</p>
          </div>
          <Switch id="quiet-high" checked={prefs.quietAllowHigh} disabled={off} onCheckedChange={(on) => onChange((p) => void (p.quietAllowHigh = on))} />
        </div>
      </CardContent>
    </Card>
  )
}
