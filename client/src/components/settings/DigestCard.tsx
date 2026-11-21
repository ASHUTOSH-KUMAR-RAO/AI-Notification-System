import { CalendarClock } from 'lucide-react'
import type { Preferences } from '@/api/preferences'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

export function DigestCard({ prefs, emailConfigured, onChange }: { prefs: Preferences; emailConfigured: boolean; onChange: (u: (p: Preferences) => void) => void }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarClock className="size-4" aria-hidden />
          Daily digest
        </CardTitle>
        <CardDescription>
          One email a day with your unread low and medium priority notifications, grouped with AI summaries. High-priority ones are emailed instantly (if enabled above).
          {!emailConfigured && ' Email is not configured on this server, so the digest cannot be sent yet.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="digest-enabled">Send me a daily digest</Label>
          <Switch id="digest-enabled" checked={prefs.digestEnabled} onCheckedChange={(on) => onChange((p) => void (p.digestEnabled = on))} />
        </div>
        <div className="space-y-2 sm:max-w-48">
          <Label htmlFor="digest-time">Delivery time ({prefs.timeZone.replace(/_/g, ' ')})</Label>
          <Input id="digest-time" type="time" value={prefs.digestTime} disabled={!prefs.digestEnabled} onChange={(e) => e.target.value && onChange((p) => void (p.digestTime = e.target.value))} />
        </div>
      </CardContent>
    </Card>
  )
}
