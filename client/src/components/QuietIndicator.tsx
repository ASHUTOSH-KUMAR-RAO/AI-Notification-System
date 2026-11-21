import { Moon } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { usePreferences } from '@/hooks/usePreferences'

/** Small moon in the navbar while quiet hours are active (decided by the server, refreshed every minute). */
export function QuietIndicator() {
  const { data } = usePreferences()
  if (!data?.quiet.active) return null

  const until = data.quiet.endsAt
    ? new Date(data.quiet.endsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: data.preferences.timeZone })
    : null
  const tip = `Quiet hours${until ? ` until ${until}` : ''}. ${data.preferences.quietAllowHigh ? 'Only high-priority alerts come through.' : 'Alerts are paused.'}`

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            role="status"
            tabIndex={0}
            aria-label={tip}
            className="flex items-center gap-1.5 rounded-full px-2 py-1 text-xs text-muted-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        }
      >
        <Moon className="size-3.5" aria-hidden />
        <span className="hidden lg:inline">Quiet hours</span>
      </TooltipTrigger>
      <TooltipContent className="max-w-64">{tip}</TooltipContent>
    </Tooltip>
  )
}
