import { Bell, BellRing, Check } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, buttonVariants } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Skeleton } from '@/components/ui/skeleton'
import { useSocket } from '@/context/SocketContext'
import { useMarkRead, useNotifications, useUnreadCount } from '@/hooks/useNotifications'
import { desktopAlertsSupported, desktopPermission, requestDesktopPermission } from '@/lib/desktopAlerts'
import { CATEGORY_META } from '@/lib/notificationMeta'
import { timeAgo } from '@/lib/time'
import { cn } from '@/lib/utils'

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [permission, setPermission] = useState(desktopPermission)
  const { latest } = useSocket()
  const { data: count = 0 } = useUnreadCount()
  const query = useNotifications({}, { enabled: open })
  const markRead = useMarkRead()

  const latestFive = query.data?.pages[0]?.items.slice(0, 5) ?? []
  const label = count > 0 ? `Notifications, ${count} unread` : 'Notifications'

  const enableDesktop = async () => setPermission(await requestDesktopPermission())

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={<Button variant="ghost" size="icon-sm" aria-label={label} className="relative" />}
      >
        {/* key={seq} remounts the icon so the ring animation replays on every new notification */}
        <Bell
          key={`bell-${latest?.seq ?? 0}`}
          className={cn('size-4 origin-top', latest && 'animate-[bell-ring_0.9s_ease-in-out]')}
          aria-hidden
        />
        {count > 0 && (
          <span
            key={`badge-${count}`}
            aria-hidden
            className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-white dark:text-background animate-[badge-pop_0.3s_ease-out]"
          >
            {count > 99 ? '99+' : count}
          </span>
        )}
      </PopoverTrigger>

      <PopoverContent align="end" className="w-[min(22rem,calc(100vw-2rem))] gap-0 p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-sm font-semibold">Notifications</h2>
          <span className="text-xs text-muted-foreground">{count > 0 ? `${count} unread` : 'All caught up'}</span>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {query.isPending ? (
            <div className="space-y-3 p-4">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : query.isError ? (
            <div role="alert" className="space-y-2 p-4 text-center text-sm">
              <p className="text-muted-foreground">Couldn't load notifications.</p>
              <Button size="sm" variant="outline" onClick={() => void query.refetch()}>
                Try again
              </Button>
            </div>
          ) : latestFive.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">No notifications yet.</p>
          ) : (
            <ul className="divide-y">
              {latestFive.map((n) => {
                const Icon = CATEGORY_META[n.category].icon
                return (
                  <li key={n.id} className={cn('flex items-start gap-3 px-4 py-3', !n.isRead && 'bg-muted/40')}>
                    <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className={cn('truncate text-sm', n.isRead ? 'font-medium' : 'font-semibold')}>
                        {!n.isRead && <span className="sr-only">Unread: </span>}
                        {n.title}
                      </p>
                      <p className="line-clamp-2 text-xs text-muted-foreground">{n.message}</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">{timeAgo(n.createdAt)}</p>
                    </div>
                    {!n.isRead && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => markRead.mutate(n.id)}
                        aria-label={`Mark "${n.title}" as read`}
                        title="Mark as read"
                      >
                        <Check className="size-4" aria-hidden />
                      </Button>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div className="space-y-2 border-t p-3">
          <Link
            to="/notifications"
            onClick={() => setOpen(false)}
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'w-full')}
          >
            View all
          </Link>
          {desktopAlertsSupported() &&
            (permission === 'default' ? (
              <Button variant="ghost" size="sm" className="w-full" onClick={() => void enableDesktop()}>
                <BellRing className="size-4" aria-hidden />
                Enable desktop alerts
              </Button>
            ) : (
              <p className="text-center text-xs text-muted-foreground">
                {permission === 'granted'
                  ? 'Desktop alerts are on while this tab is in the background.'
                  : 'Desktop alerts are blocked in your browser settings.'}
              </p>
            ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}


