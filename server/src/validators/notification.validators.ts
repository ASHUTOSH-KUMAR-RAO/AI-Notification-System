import { z } from 'zod'

export const CATEGORIES = ['SYSTEM', 'ORDER', 'SECURITY', 'SOCIAL', 'PROMOTION', 'REMINDER'] as const
export const PRIORITIES = ['HIGH', 'MEDIUM', 'LOW'] as const

// Only http(s) URLs or same-site paths: blocks javascript:/data: links rendered by the client.
const actionUrl = z
  .string()
  .trim()
  .max(2048)
  .refine((v) => /^https?:\/\/\S+$/i.test(v) || /^\/(?!\/)\S*$/.test(v), 'Must be an http(s) URL or a path starting with /')

export const createNotificationSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(120, 'Title must be at most 120 characters'),
  message: z.string().trim().min(1, 'Message is required').max(1000, 'Message must be at most 1000 characters'),
  // Optional: when omitted, the AI (or rule-based fallback) chooses. When provided, the user's value always wins.
  category: z.enum(CATEGORIES).optional(),
  priority: z.enum(PRIORITIES).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  actionUrl: actionUrl.optional(),
})

const boolString = z.enum(['true', 'false']).transform((v) => v === 'true')

export const listNotificationsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().max(200).optional(),
  isRead: boolString.optional(),
  category: z.enum(CATEGORIES).optional(),
  priority: z.enum(PRIORITIES).optional(),
  search: z.string().trim().max(100).optional(),
  /** true: only spam; omitted/false: spam is hidden everywhere else. */
  spam: boolString.optional(),
  view: z.enum(['list', 'grouped']).default('list'),
})

export const idParamSchema = z.object({ id: z.uuid('Invalid notification id') })

export const bulkDeleteSchema = z.object({
  ids: z.array(z.uuid('Invalid notification id')).min(1, 'Select at least one notification').max(100),
})

export type CreateNotificationInput = z.infer<typeof createNotificationSchema>
export type ListNotificationsQuery = z.infer<typeof listNotificationsQuerySchema>

