import { api, type ApiResponse } from '@/lib/api'

export const CATEGORIES = ['SYSTEM', 'ORDER', 'SECURITY', 'SOCIAL', 'PROMOTION', 'REMINDER'] as const
export const PRIORITIES = ['HIGH', 'MEDIUM', 'LOW'] as const
export type Category = (typeof CATEGORIES)[number]
export type Priority = (typeof PRIORITIES)[number]

export type AiStatus = 'PENDING' | 'DONE' | 'FALLBACK' | 'FAILED'

export interface Notification {
  id: string
  title: string
  message: string
  category: Category
  priority: Priority
  isRead: boolean
  readAt: string | null
  metadata: Record<string, unknown> | null
  actionUrl: string | null
  createdAt: string
  updatedAt: string
  aiStatus: AiStatus
  /** One-line AI (or rule-based) explanation of the priority. */
  aiPriorityReason: string | null
  /** true: priority was chosen by the user, the AI never overrides it. */
  prioritySetByUser: boolean
  categorySetByUser: boolean
  isSpam: boolean
  spamScore: number | null
  summary: string | null
  groupKey: string | null
  analyzedAt: string | null
  /** e.g. "You usually open order updates quickly" when your behaviour changed the priority. */
  personalizationReason: string | null
  feedback: 'IMPORTANT' | 'NOT_IMPORTANT' | null
}

export interface NotificationGroup {
  groupKey: string
  count: number
  unreadCount: number
  latestAt: string
  /** null for a single notification. */
  summary: string | null
  summarySource: 'AI' | 'FALLBACK' | null
  items: Notification[]
}

export interface GroupPage {
  groups: NotificationGroup[]
  nextCursor: string | null
}

export interface AiStatusInfo {
  enabled: boolean
  mode: 'ai' | 'fallback'
}

export interface NotificationPage {
  items: Notification[]
  nextCursor: string | null
}

export interface NotificationFilters {
  isRead?: boolean
  category?: Category
  priority?: Priority
  search?: string
  spam?: boolean
}

export interface CreateNotificationInput {
  title: string
  message: string
  /** Omit to let the AI decide. */
  category?: Category
  priority?: Priority
}

const PAGE_SIZE = 15

// Every helper unwraps the { success, message, data, error } envelope.
const unwrap = <T>(res: { data: ApiResponse<T> }) => res.data.data as T

export const fetchNotifications = (filters: NotificationFilters, cursor?: string) =>
  api
    .get<ApiResponse<NotificationPage>>('/notifications', {
      params: { limit: PAGE_SIZE, cursor, ...filters, search: filters.search || undefined },
    })
    .then(unwrap)

export const fetchUnreadCount = () =>
  api.get<ApiResponse<{ count: number }>>('/notifications/unread-count').then((r) => unwrap(r).count)

export const createNotification = (input: CreateNotificationInput) =>
  api.post<ApiResponse<{ notification: Notification }>>('/notifications', input).then(unwrap)

export const markNotificationRead = (id: string) => api.patch(`/notifications/${id}/read`)
export const markAllNotificationsRead = () => api.patch('/notifications/read-all')
export const deleteNotification = (id: string) => api.delete(`/notifications/${id}`)
export const deleteNotifications = (ids: string[]) => api.delete('/notifications', { data: { ids } })

export const fetchGroups = (cursor?: string) =>
  api.get<ApiResponse<GroupPage>>('/notifications', { params: { view: 'grouped', limit: 10, cursor } }).then(unwrap)

export const reanalyzeNotification = (id: string) =>
  api.post<ApiResponse<{ notification: Notification }>>(`/notifications/${id}/reanalyze`).then((r) => unwrap(r).notification)

export const markNotificationNotSpam = (id: string) =>
  api.patch<ApiResponse<{ notification: Notification }>>(`/notifications/${id}/not-spam`).then((r) => unwrap(r).notification)

export const fetchAiStatus = () => api.get<ApiResponse<AiStatusInfo>>('/notifications/ai-status').then(unwrap)

export type Feedback = 'IMPORTANT' | 'NOT_IMPORTANT'

export const sendFeedback = (id: string, value: Feedback | null) =>
  api.post<ApiResponse<{ notification: Notification }>>(`/notifications/${id}/feedback`, { value }).then((r) => unwrap(r).notification)
