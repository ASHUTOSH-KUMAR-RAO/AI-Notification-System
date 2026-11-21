import { AlertTriangle, ChevronDown, Layers, Loader2, Sparkles } from 'lucide-react'
import type { NotificationGroup } from '@/api/notifications'
import { NotificationItem, type ItemActions } from '@/components/notifications/NotificationItem'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Skeleton } from '@/components/ui/skeleton'
import { useGroups } from '@/hooks/useNotifications'
import { timeAgo } from '@/lib/time'

function GroupCard({ group, actions }: { group: NotificationGroup; actions: ItemActions }) {
  return (
    <li className="glass rounded-2xl border animate-in fade-in duration-300">
      <Collapsible>
        <CollapsibleTrigger
          render={
            <button
              type="button"
              className="group flex w-full items-start gap-3 rounded-xl p-3 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50 sm:p-4"
            />
          }
        >
          <span aria-hidden className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Layers className="size-4" />
          </span>
          <span className="min-w-0 flex-1 space-y-1">
            <span className="block break-words text-sm font-semibold">
              {group.summarySource === 'AI' && <Sparkles className="mr-1 inline size-3.5 text-primary" aria-label="AI summary" />}
              {group.summary}
            </span>
            <span className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="secondary">{group.count} notifications</Badge>
              {group.unreadCount > 0 && <Badge variant="destructive">{group.unreadCount} unread</Badge>}
              <span>{timeAgo(group.latestAt)}</span>
            </span>
          </span>
          <ChevronDown className="mt-2 size-4 shrink-0 text-muted-foreground transition-transform group-data-[panel-open]:rotate-180" aria-hidden />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <ul className="space-y-2 p-3 sm:p-4">
            {group.items.map((n) => (
              <NotificationItem key={n.id} notification={n} {...actions} />
            ))}
          </ul>
        </CollapsibleContent>
      </Collapsible>
    </li>
  )
}

/** "Grouped" view: similar notifications from the last minutes collapse into one card with an AI summary. */
export function GroupedList({ actions }: { actions: ItemActions }) {
  const query = useGroups()
  const groups = query.data?.pages.flatMap((p) => p.groups).filter((g) => g.items.length > 0) ?? []

  if (query.isPending) {
    return (
      <ul className="space-y-3" aria-label="Loading groups" aria-busy>
        {[0, 1, 2, 3].map((i) => (
          <li key={i}>
            <Skeleton className="h-20 w-full rounded-xl" />
          </li>
        ))}
      </ul>
    )
  }
  if (query.isError) {
    return (
      <div role="alert" className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-12 text-center">
        <AlertTriangle className="size-8 text-destructive" aria-hidden />
        <div>
          <p className="font-medium">Couldn't load groups</p>
          <p className="text-sm text-muted-foreground">{query.error.message}</p>
        </div>
        <Button onClick={() => void query.refetch()}>Try again</Button>
      </div>
    )
  }
  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-16 text-center">
        <Layers className="size-8 text-muted-foreground" aria-hidden />
        <p className="font-medium">Nothing to group yet</p>
        <p className="text-sm text-muted-foreground">Similar notifications that arrive close together are grouped here.</p>
      </div>
    )
  }

  return (
    <>
      <ul className="space-y-3">
        {groups.map((g) =>
          g.count >= 2 ? <GroupCard key={g.groupKey} group={g} actions={actions} /> : <NotificationItem key={g.groupKey} notification={g.items[0]} {...actions} />,
        )}
      </ul>
      {query.hasNextPage && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => void query.fetchNextPage()} disabled={query.isFetchingNextPage}>
            {query.isFetchingNextPage && <Loader2 className="size-4 animate-spin" aria-hidden />}
            Load more
          </Button>
        </div>
      )}
    </>
  )
}

