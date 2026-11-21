import type { InfiniteData, QueryClient } from '@tanstack/react-query'
import type { Notification, NotificationFilters, NotificationPage } from '@/api/notifications'

export const notificationKeys = {
  all: ['notifications'] as const,
  lists: ['notifications', 'list'] as const,
  list: (filters: NotificationFilters) => ['notifications', 'list', filters] as const,
  unread: ['notifications', 'unread'] as const,
  groups: ['notifications', 'groups'] as const,
  aiStatus: ['notifications', 'ai-status'] as const,
}

export type Pages = InfiniteData<NotificationPage, string | undefined>

/** Marks items read. In the "Unread" view a read item disappears; elsewhere it just changes style. */
export function applyRead(items: Notification[], ids: Set<string> | 'all', filters: NotificationFilters) {
  const hit = (n: Notification) => ids === 'all' || ids.has(n.id)
  if (filters.isRead === false) return items.filter((n) => !hit(n))
  const now = new Date().toISOString()
  return items.map((n) => (hit(n) && !n.isRead ? { ...n, isRead: true, readAt: now } : n))
}

export const removeIds = (items: Notification[], ids: Set<string>) => items.filter((n) => !ids.has(n.id))

/** Client-side mirror of the server's list filters, so a pushed notification only enters lists it belongs in. */
export function matchesFilters(n: Notification, f: NotificationFilters) {
  if ((f.spam ?? false) !== n.isSpam) return false // spam lives only in the Spam view
  if (f.isRead !== undefined && f.isRead !== n.isRead) return false
  if (f.category && f.category !== n.category) return false
  if (f.priority && f.priority !== n.priority) return false
  if (f.search) {
    const q = f.search.toLowerCase()
    if (!n.title.toLowerCase().includes(q) && !n.message.toLowerCase().includes(q)) return false
  }
  return true
}

/** Applies `fn` to the items of every cached notification list (all filters). */
export function mapLists(
  qc: QueryClient,
  fn: (items: Notification[], filters: NotificationFilters) => Notification[],
) {
  for (const [key, data] of qc.getQueriesData<Pages>({ queryKey: notificationKeys.lists })) {
    if (!data) continue
    const filters = key[2] as NotificationFilters
    qc.setQueryData<Pages>(key, { ...data, pages: data.pages.map((p) => ({ ...p, items: fn(p.items, filters) })) })
  }
}

const newerFirst = (a: Notification, b: Notification) =>
  a.createdAt === b.createdAt ? (a.id < b.id ? 1 : -1) : a.createdAt < b.createdAt ? 1 : -1

/**
 * Applies a pushed/updated notification to every cached list:
 * replaces it where it already is (and still matches), removes it where it no longer matches
 * (e.g. flagged as spam), and inserts it in order where it newly matches and falls inside the loaded range.
 */
export function upsertNotification(qc: QueryClient, n: Notification) {
  for (const [key, data] of qc.getQueriesData<Pages>({ queryKey: notificationKeys.lists })) {
    if (!data || data.pages.length === 0) continue
    const matches = matchesFilters(n, key[2] as NotificationFilters)
    const exists = data.pages.some((p) => p.items.some((i) => i.id === n.id))

    let pages = data.pages
    if (exists) {
      pages = pages.map((p) => ({
        ...p,
        items: matches ? p.items.map((i) => (i.id === n.id ? n : i)) : p.items.filter((i) => i.id !== n.id),
      }))
    } else if (matches) {
      // First page whose last item is older than n: n belongs in (or before the end of) that page.
      let at = pages.findIndex((p) => p.items.length > 0 && newerFirst(n, p.items[p.items.length - 1]) < 0)
      if (at === -1) {
        const last = pages[pages.length - 1]
        if (last.nextCursor) continue // older than everything loaded; it will arrive via pagination
        at = pages.length - 1
      }
      pages = pages.map((p, i) => (i === at ? { ...p, items: [...p.items, n].sort(newerFirst) } : p))
    } else continue
    qc.setQueryData<Pages>(key, { ...data, pages })
  }
}
