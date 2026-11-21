import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import * as api from '@/api/notifications'
import type { Notification, NotificationFilters } from '@/api/notifications'
import { useAuth } from '@/context/AuthContext'
import { track } from '@/lib/eventTracker'
import { useSocket } from '@/context/SocketContext'
import { applyRead, mapLists, notificationKeys, removeIds, upsertNotification, type Pages } from '@/lib/notificationCache'

export { notificationKeys }

const POLL_MS = 30_000

/** Real-time pushes keep the cache fresh while the socket is live; otherwise fall back to 30s polling. */
function usePollInterval() {
  const { status } = useSocket()
  return status === 'live' ? false : POLL_MS
}

export function useNotifications(filters: NotificationFilters, { enabled = true } = {}) {
  const refetchInterval = usePollInterval()
  return useInfiniteQuery({
    queryKey: notificationKeys.list(filters),
    queryFn: ({ pageParam }) => api.fetchNotifications(filters, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled,
    refetchInterval,
  })
}

export function useUnreadCount() {
  const { user } = useAuth()
  const refetchInterval = usePollInterval()
  return useQuery({
    queryKey: notificationKeys.unread,
    queryFn: api.fetchUnreadCount,
    enabled: !!user,
    refetchInterval,
  })
}

/**
 * Optimistic update across every cached list + the unread badge.
 * `affectedUnread` counts the unread notifications the action flips/removes so the badge stays in sync.
 * Returns a rollback function.
 */
function optimistic(
  qc: QueryClient,
  apply: (items: Notification[], filters: NotificationFilters) => Notification[],
  affectedUnread: (cached: Map<string, Notification>) => number,
) {
  const lists = qc.getQueriesData<Pages>({ queryKey: notificationKeys.lists })
  const unread = qc.getQueryData<number>(notificationKeys.unread)

  const cached = new Map<string, Notification>()
  for (const [, data] of lists) data?.pages.forEach((p) => p.items.forEach((n) => cached.set(n.id, n)))

  mapLists(qc, apply)
  if (unread !== undefined) qc.setQueryData(notificationKeys.unread, Math.max(0, unread - affectedUnread(cached)))

  return () => {
    for (const [key, data] of lists) qc.setQueryData(key, data)
    qc.setQueryData(notificationKeys.unread, unread)
  }
}

type Rollback = () => void

function useNotificationMutation<V>(opts: {
  fn: (v: V) => Promise<unknown>
  optimistic: (qc: QueryClient, v: V) => Rollback
  success?: string
  error: string
}) {
  const qc = useQueryClient()
  return useMutation<unknown, Error, V, { rollback: Rollback }>({
    mutationFn: opts.fn,
    onMutate: async (v) => {
      await qc.cancelQueries({ queryKey: notificationKeys.all })
      return { rollback: opts.optimistic(qc, v) }
    },
    onError: (err, _v, ctx) => {
      ctx?.rollback()
      toast.error(`${opts.error}: ${err.message}`)
    },
    onSuccess: () => {
      if (opts.success) toast.success(opts.success)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: notificationKeys.all }),
  })
}

/** Deleting something you never opened is a (negative) engagement signal; deleting something you read is not. */
function trackDismissed(qc: QueryClient, ids: string[]) {
  const unread = new Set<string>()
  for (const [, data] of qc.getQueriesData<Pages>({ queryKey: notificationKeys.lists }))
    data?.pages.forEach((p) => p.items.forEach((n) => !n.isRead && unread.add(n.id)))
  ids.filter((id) => unread.has(id)).forEach((id) => track(id, 'DISMISSED'))
}

const unreadIn = (cached: Map<string, Notification>, ids: string[]) =>
  ids.filter((id) => cached.get(id)?.isRead === false).length

export const useMarkRead = () =>
  useNotificationMutation<string>({
    fn: (id) => {
      track(id, 'OPENED') // marking read is the \"opened\" signal (never blocks the request)
      return api.markNotificationRead(id)
    },
    optimistic: (qc, id) =>
      optimistic(qc, (items, f) => applyRead(items, new Set([id]), f), (c) => unreadIn(c, [id])),
    error: 'Could not mark as read',
  })

export const useMarkAllRead = () =>
  useNotificationMutation<void>({
    fn: api.markAllNotificationsRead,
    // Every unread notification is affected, including ones not loaded yet: the badge goes straight to 0.
    optimistic: (qc) => optimistic(qc, (items, f) => applyRead(items, 'all', f), () => Number.POSITIVE_INFINITY),
    success: 'All notifications marked as read',
    error: 'Could not mark all as read',
  })

export const useDeleteNotifications = () =>
  useNotificationMutation<string[]>({
    fn: (ids) => (ids.length === 1 ? api.deleteNotification(ids[0]) : api.deleteNotifications(ids)),
    optimistic: (qc, ids) => {
      trackDismissed(qc, ids)
      const set = new Set(ids)
      return optimistic(qc, (items) => removeIds(items, set), (c) => unreadIn(c, ids))
    },
    success: 'Deleted',
    error: 'Could not delete',
  })

export function useCreateNotification() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.createNotification,
    onSuccess: () => qc.invalidateQueries({ queryKey: notificationKeys.all }),
  })
}

/** Grouped view: groups ordered by newest member, each with an AI summary (rule-based until the AI one is ready). */
export function useGroups({ enabled = true } = {}) {
  const refetchInterval = usePollInterval()
  return useInfiniteQuery({
    queryKey: notificationKeys.groups,
    queryFn: ({ pageParam }) => api.fetchGroups(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled,
    refetchInterval,
  })
}

/** Drives the "smart sorting limited" hint. Cheap, so a slow poll is fine. */
export function useAiStatus() {
  const { user } = useAuth()
  return useQuery({
    queryKey: notificationKeys.aiStatus,
    queryFn: api.fetchAiStatus,
    enabled: !!user,
    staleTime: 30_000,
    refetchInterval: 60_000,
  })
}

export function useReanalyze() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.reanalyzeNotification,
    onSuccess: (n) => {
      upsertNotification(qc, n) // shows the "Analyzing..." shimmer right away; the result arrives via the socket
      toast.info('Re-analyzing with AI...')
    },
    onError: (err: Error) => toast.error(`Could not start re-analysis: ${err.message}`),
    onSettled: () => qc.invalidateQueries({ queryKey: notificationKeys.aiStatus }),
  })
}

export function useNotSpam() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.markNotificationNotSpam,
    onSuccess: (n) => {
      upsertNotification(qc, n) // leaves the Spam view, joins the inbox
      toast.success('Moved back to your inbox')
    },
    onError: (err: Error) => toast.error(`Could not update: ${err.message}`),
    onSettled: () => qc.invalidateQueries({ queryKey: notificationKeys.all }),
  })
}

/** "Was this important?" - applied instantly, then reconciled with the server's re-personalized notification. */
export function useFeedback() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, value }: { id: string; value: api.Feedback | null }) => api.sendFeedback(id, value),
    onMutate: ({ id, value }) => {
      mapLists(qc, (items) => items.map((n) => (n.id === id ? { ...n, feedback: value } : n)))
    },
    onSuccess: (n, { value }) => {
      upsertNotification(qc, n)
      toast.success(value === null ? 'Feedback removed' : "Thanks, we'll learn from this")
    },
    onError: (err: Error) => {
      toast.error(`Could not save feedback: ${err.message}`)
      void qc.invalidateQueries({ queryKey: notificationKeys.all })
    },
  })
}
