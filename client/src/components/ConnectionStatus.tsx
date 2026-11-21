import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useSocket, type ConnectionStatus as Status } from '@/context/SocketContext'
import { cn } from '@/lib/utils'

const META: Record<Status, { label: string; tip: string; dot: string }> = {
  live: { label: 'Live', tip: 'Connected: notifications arrive instantly.', dot: 'bg-emerald-500' },
  reconnecting: { label: 'Reconnecting', tip: 'Connection lost. Retrying; checking for updates every 30 seconds meanwhile.', dot: 'bg-amber-500 animate-pulse' },
  offline: { label: 'Offline', tip: "You're offline. Updates will resume when you're back online.", dot: 'bg-muted-foreground' },
}

export function ConnectionStatus() {
  const { status } = useSocket()
  const { label, tip, dot } = META[status]

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            role="status"
            tabIndex={0}
            aria-label={`Connection status: ${label}`}
            className="flex items-center gap-1.5 rounded-full px-2 py-1 text-xs text-muted-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        }
      >
        <span aria-hidden className={cn('size-2 rounded-full', dot)} />
        <span className="hidden lg:inline">{label}</span>
      </TooltipTrigger>
      <TooltipContent>{tip}</TooltipContent>
    </Tooltip>
  )
}
