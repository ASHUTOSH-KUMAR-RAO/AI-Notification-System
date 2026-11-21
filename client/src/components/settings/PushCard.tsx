import { Loader2, Smartphone } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { usePush, type PushState } from '@/hooks/usePreferences'

const STATUS: Record<PushState, { label: string; variant: 'secondary' | 'outline' | 'destructive'; text: string }> = {
  checking: { label: 'Checking...', variant: 'outline', text: 'Checking this device...' },
  unsupported: { label: 'Not supported', variant: 'outline', text: "This browser doesn't support web push. Try a recent Chrome, Edge, Firefox or Safari (installed to the Home Screen on iOS)." },
  unconfigured: { label: 'Not configured', variant: 'outline', text: 'Web push is not configured on this server yet (it needs VAPID keys).' },
  denied: { label: 'Blocked', variant: 'destructive', text: "Notifications are blocked for this site. Allow them in your browser's site settings, then come back." },
  off: { label: 'Off', variant: 'secondary', text: 'Get alerts on this device even when the app is closed.' },
  on: { label: 'On', variant: 'secondary', text: 'This device will get push alerts while you are away from the app.' },
}

export function PushCard() {
  const { state, busy, enable, disable } = usePush()
  const s = STATUS[state]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="size-4" aria-hidden />
          Push notifications
          <Badge variant={s.variant}>{s.label}</Badge>
        </CardTitle>
        <CardDescription>
          Choose which categories use push in the Categories section. Push is skipped while the app is open (you already see a toast).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p role="status" className="text-sm text-muted-foreground">{s.text}</p>
        {(state === 'off' || state === 'on') && (
          <Button variant={state === 'on' ? 'outline' : 'default'} onClick={() => void (state === 'on' ? disable() : enable())} disabled={busy}>
            {busy && <Loader2 className="size-4 animate-spin" aria-hidden />}
            {state === 'on' ? 'Disable push on this device' : 'Enable push on this device'}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
