import { api, type ApiResponse } from '@/lib/api'
import type { Category, Priority } from '@/api/notifications'

export interface CategoryPref {
  enabled: boolean
  channels: { inApp: boolean; email: boolean; push: boolean }
}

export interface Preferences {
  categories: Record<Category, CategoryPref>
  minAlertPriority: Priority
  quietHoursEnabled: boolean
  quietStart: string
  quietEnd: string
  timeZone: string
  quietAllowHigh: boolean
  digestEnabled: boolean
  digestTime: string
}

export interface PreferencesView {
  preferences: Preferences
  channels: {
    email: { configured: boolean }
    push: { configured: boolean; publicKey: string | null; subscriptions: number }
  }
  quiet: { active: boolean; endsAt: string | null }
}

const unwrap = <T>(res: { data: ApiResponse<T> }) => res.data.data as T

export const fetchPreferences = () => api.get<ApiResponse<PreferencesView>>('/preferences').then(unwrap)
export const savePreferences = (patch: Partial<Preferences>) => api.patch<ApiResponse<PreferencesView>>('/preferences', patch).then(unwrap)
export const pushSubscribe = (sub: { endpoint: string; keys: { p256dh: string; auth: string } }) => api.post('/push/subscribe', sub)
export const pushUnsubscribe = (endpoint: string) => api.post('/push/unsubscribe', { endpoint })
