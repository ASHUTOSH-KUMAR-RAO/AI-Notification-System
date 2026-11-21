import type { Category, Notification, Priority } from '@/api/notifications'
import { api, type ApiResponse } from '@/lib/api'

export type Range = '7d' | '30d' | '90d'
export type Channel = 'IN_APP' | 'EMAIL' | 'PUSH'

export interface Summary {
  total: number
  unread: number
  read: number
  spam: number
  aiAnalyzed: number
  aiFallback: number
  readRate: number
  avgTimeToOpenMs: number | null
}

export interface Overview {
  range: Range
  generatedAt: string
  current: Summary
  previous: Summary
  overTime: ({ date: string } & Record<Priority, number>)[]
  categories: { category: Category; count: number }[]
  delivery: { channel: Channel; sent: number; failed: number; skipped: number; total: number; successRate: number | null }[]
  engagement: { category: Category; score: number; samples: number }[]
  recentHigh: Notification[]
}

export const analyticsKeys = { all: ['analytics'] as const, overview: (range: Range) => ['analytics', 'overview', range] as const }

export const fetchOverview = async (range: Range) => (await api.get<ApiResponse<Overview>>('/analytics/overview', { params: { range } })).data.data!
