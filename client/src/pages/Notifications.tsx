import { AlertTriangle, BellOff, CheckCheck, Layers, Loader2, Search, ShieldAlert, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Seo } from '@/components/Seo'
import { CATEGORIES, PRIORITIES, type Category, type NotificationFilters, type Priority } from '@/api/notifications'
import { AiStatusHint } from '@/components/notifications/AiStatusHint'
import { GroupedList } from '@/components/notifications/GroupedList'
import { NotificationItem, type ItemActions } from '@/components/notifications/NotificationItem'
import { SendTestDialog } from '@/components/notifications/SendTestDialog'
import { SimpleSelect, type Option } from '@/components/SimpleSelect'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useDebounce } from '@/hooks/useDebounce'
import {
  useDeleteNotifications,
  useFeedback,
  useMarkAllRead,
  useMarkRead,
  useNotifications,
  useNotSpam,
  useReanalyze,
  useUnreadCount,
} from '@/hooks/useNotifications'
import { CATEGORY_META, PRIORITY_META } from '@/lib/notificationMeta'

type Tab = 'all' | 'unread' | 'spam'
const categoryOptions: Option<Category | 'ALL'>[] = [{ value: 'ALL', label: 'All categories' }, ...CATEGORIES.map((c) => ({ value: c, label: CATEGORY_META[c].label }))]
const priorityOptions: Option<Priority | 'ALL'>[] = [{ value: 'ALL', label: 'All priorities' }, ...PRIORITIES.map((p) => ({ value: p, label: PRIORITY_META[p].label }))]

export default function Notifications() {
  const [tab, setTab] = useState<Tab>('all')
  const [category, setCategory] = useState<Category | 'ALL'>('ALL')
  const [priority, setPriority] = useState<Priority | 'ALL'>('ALL')
  const [searchInput, setSearchInput] = useState('')
  const search = useDebounce(searchInput.trim())
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [grouped, setGrouped] = useState(false)
  // Grouping is a view of the whole inbox, so it only applies to the All tab.
  const groupedMode = grouped && tab === 'all'

  const filters = useMemo<NotificationFilters>(
    () => ({
      isRead: tab === 'unread' ? false : undefined,
      spam: tab === 'spam' ? true : undefined,
      category: category === 'ALL' ? undefined : category,
      priority: priority === 'ALL' ? undefined : priority,
      search: search || undefined,
    }),
    [tab, category, priority, search],
  )
  const hasFilters = tab !== 'all' || category !== 'ALL' || priority !== 'ALL' || search !== ''

  const query = useNotifications(filters, { enabled: !groupedMode })
  const { data: unreadCount = 0 } = useUnreadCount()
  const markRead = useMarkRead()
  const markAllRead = useMarkAllRead()
  const remove = useDeleteNotifications()
  const reanalyze = useReanalyze()
  const notSpam = useNotSpam()
  const feedback = useFeedback()
  const actions: ItemActions = {
    onMarkRead: (id) => markRead.mutate(id),
    onDelete: (id) => remove.mutate([id]),
    onReanalyze: (id) => reanalyze.mutate(id),
    onNotSpam: (id) => notSpam.mutate(id),
    onFeedback: (id, value) => feedback.mutate({ id, value }),
  }

  const items = useMemo(() => query.data?.pages.flatMap((p) => p.items) ?? [], [query.data])
  const allSelected = items.length > 0 && items.every((n) => selected.has(n.id))

  // Any change of the visible list resets the selection so bulk actions never hit hidden rows.
  const withReset = <T,>(set: (v: T) => void) => (v: T) => {
    set(v)
    setSelected(new Set())
  }

  const toggle = (id: string, on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (on) next.add(id)
      else next.delete(id)
      return next
    })

  const bulkDelete = () => {
    remove.mutate([...selected])
    setSelected(new Set())
    setConfirmOpen(false)
  }

  return (
    <section className="space-y-6">
      <Seo title="Inbox" description="Your prioritized, AI-sorted notifications." />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Notifications</h1>
          <p className="text-sm text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <SendTestDialog />
          <Button variant="outline" onClick={() => markAllRead.mutate()} disabled={unreadCount === 0 || markAllRead.isPending}>
            <CheckCheck className="size-4" aria-hidden />
            Mark all read
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={withReset((v: Tab) => setTab(v))}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="unread">
            Unread
            {unreadCount > 0 && <Badge variant="secondary">{unreadCount > 99 ? '99+' : unreadCount}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="spam">
            <ShieldAlert className="size-3.5" aria-hidden />
            Spam
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <AiStatusHint />

      <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
        <label htmlFor="group-toggle" className="flex cursor-pointer items-center gap-2 text-sm font-medium">
          <Layers className="size-4 text-muted-foreground" aria-hidden />
          Group similar notifications
          <span className="hidden text-xs font-normal text-muted-foreground sm:inline">with AI summaries</span>
        </label>
        <Switch id="group-toggle" checked={groupedMode} disabled={tab !== 'all'} onCheckedChange={setGrouped} />
      </div>

      {!groupedMode && (
      <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            type="search"
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value)
              setSelected(new Set())
            }}
            placeholder="Search notifications"
            aria-label="Search notifications"
            className="pl-8"
          />
        </div>
        <SimpleSelect aria-label="Filter by category" className="w-full sm:w-44" value={category} onChange={withReset(setCategory)} options={categoryOptions} />
        <SimpleSelect aria-label="Filter by priority" className="w-full sm:w-40" value={priority} onChange={withReset(setPriority)} options={priorityOptions} />
      </div>
      )}

      {!groupedMode && items.length > 0 && (
        <div className="flex min-h-8 items-center justify-between gap-2 text-sm">
          <label className="flex cursor-pointer items-center gap-2">
            <Checkbox
              checked={allSelected}
              onCheckedChange={(c) => setSelected(c === true ? new Set(items.map((n) => n.id)) : new Set())}
              aria-label="Select all loaded notifications"
            />
            <span className="text-muted-foreground">{selected.size > 0 ? `${selected.size} selected` : 'Select all'}</span>
          </label>
          {selected.size > 0 && (
            <Button variant="destructive" size="sm" onClick={() => setConfirmOpen(true)}>
              <Trash2 className="size-4" aria-hidden />
              Delete selected
            </Button>
          )}
        </div>
      )}

      {groupedMode ? (
        <GroupedList actions={actions} />
      ) : query.isPending ? (
        <ul className="space-y-3" aria-label="Loading notifications" aria-busy>
          {Array.from({ length: 5 }, (_, i) => (
            <li key={i}>
              <Skeleton className="h-24 w-full rounded-xl" />
            </li>
          ))}
        </ul>
      ) : query.isError ? (
        <div role="alert" className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-12 text-center">
          <AlertTriangle className="size-8 text-destructive" aria-hidden />
          <div>
            <p className="font-medium">Couldn't load notifications</p>
            <p className="text-sm text-muted-foreground">{query.error.message}</p>
          </div>
          <Button onClick={() => void query.refetch()}>Try again</Button>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-16 text-center">
          <BellOff className="size-8 text-muted-foreground" aria-hidden />
          <p className="font-medium">{tab === 'spam' && !search && category === 'ALL' && priority === 'ALL' ? 'No spam' : hasFilters ? 'No notifications match your filters' : 'No notifications yet'}</p>
          <p className="text-sm text-muted-foreground">
            {tab === 'spam' ? 'Notifications the AI flags as spam show up here.' : hasFilters ? 'Try a different search or clear the filters.' : 'Use "Send test" to create your first one.'}
          </p>
        </div>
      ) : (
        <>
          <ul className="space-y-3">
            {items.map((n) => (
              <NotificationItem
                key={n.id}
                notification={n}
                selected={selected.has(n.id)}
                onSelect={(on) => toggle(n.id, on)}
                {...actions}
              />
            ))}
          </ul>
          {query.isFetchNextPageError && (
            <p role="alert" className="text-center text-sm text-destructive">
              Couldn't load more notifications.
            </p>
          )}
          {query.hasNextPage && (
            <div className="flex justify-center">
              <Button variant="outline" onClick={() => void query.fetchNextPage()} disabled={query.isFetchingNextPage}>
                {query.isFetchingNextPage && <Loader2 className="size-4 animate-spin" aria-hidden />}
                {query.isFetchNextPageError ? 'Retry' : 'Load more'}
              </Button>
            </div>
          )}
        </>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selected.size} notification{selected.size === 1 ? '' : 's'}?</AlertDialogTitle>
            <AlertDialogDescription>This removes them from your list. This can't be undone from the app.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={bulkDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}



