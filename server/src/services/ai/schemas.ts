import { z } from 'zod'
import { CATEGORIES, PRIORITIES } from '../../validators/notification.validators'

export type Category = (typeof CATEGORIES)[number]
export type Priority = (typeof PRIORITIES)[number]

/** Normalized result of analysing one notification, from either the LLM or the rules. */
export interface Analysis {
  priority: Priority
  reason: string
  isSpam: boolean
  spamScore: number
  category: Category
  summary: string | null
}

const upper = z.string().transform((s) => s.trim().toUpperCase())

/** Strict contract for the model's JSON. Lenient about case only; anything else invalid triggers a retry. */
export const llmAnalysisSchema = z.object({
  priority: upper.pipe(z.enum(PRIORITIES)),
  priorityReason: z.string().trim().min(1).max(200),
  isSpam: z.boolean(),
  spamScore: z.number().min(0).max(1),
  category: upper.pipe(z.enum(CATEGORIES)),
  summary: z.string().trim().max(300).nullable().optional(),
})

export const llmGroupSummarySchema = z.object({ summary: z.string().trim().min(1).max(300) })
