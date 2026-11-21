import { z } from 'zod'
import { isValidTimeZone } from '../utils/time'
import { CATEGORIES, PRIORITIES } from './notification.validators'

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:mm (24-hour)')

const channelsPatch = z
  .object({ inApp: z.boolean().optional(), email: z.boolean().optional(), push: z.boolean().optional() })
  .strict()

const categoryPatch = z.object({ enabled: z.boolean().optional(), channels: channelsPatch.optional() }).strict()

export const updatePreferencesSchema = z
  .object({
    categories: z.object(Object.fromEntries(CATEGORIES.map((c) => [c, categoryPatch.optional()]))).strict().optional(),
    minAlertPriority: z.enum(PRIORITIES).optional(),
    quietHoursEnabled: z.boolean().optional(),
    quietStart: hhmm.optional(),
    quietEnd: hhmm.optional(),
    timeZone: z.string().refine(isValidTimeZone, 'Unknown time zone').optional(),
    quietAllowHigh: z.boolean().optional(),
    digestEnabled: z.boolean().optional(),
    digestTime: hhmm.optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, 'Nothing to update')

export const pushSubscribeSchema = z.object({
  endpoint: z.url().max(2048),
  keys: z.object({ p256dh: z.string().min(1).max(256), auth: z.string().min(1).max(256) }),
})

export const pushUnsubscribeSchema = z.object({ endpoint: z.url().max(2048) })

export const eventsBatchSchema = z.object({
  events: z
    .array(
      z.object({
        notificationId: z.uuid(),
        type: z.enum(['OPENED', 'CLICKED', 'DISMISSED']),
      }),
    )
    .min(1)
    .max(50),
})

export const notificationEventsSchema = z.object({
  events: z.array(z.object({ type: z.enum(['OPENED', 'CLICKED', 'DISMISSED']) })).min(1).max(3),
})

export const feedbackSchema = z.object({ value: z.enum(['IMPORTANT', 'NOT_IMPORTANT']).nullable() })
