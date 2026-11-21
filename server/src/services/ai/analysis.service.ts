import { env } from '../../config/env'
import { contentHash, TtlCache, UserRateLimiter } from './cache'
import { callJson, getGroq, LlmError, type FailureReason, type GroqLike } from './llm'
import { buildAnalysisUserMessage, buildGroupUserMessage, ANALYSIS_SYSTEM_PROMPT, GROUP_SYSTEM_PROMPT } from './prompts'
import { classifyWithRules, isInjectionAttempt, summarizeGroupWithRules } from './rules'
import { llmAnalysisSchema, llmGroupSummarySchema, type Analysis, type Category } from './schemas'
import { log } from '../../utils/logger'

export interface Deps {
  client: GroqLike | null
  sleep?: (ms: number) => Promise<void>
  limiter: UserRateLimiter
  cache: TtlCache<Analysis>
  timeoutMs: number
  models: { fast: string; smart: string }
}

export interface AnalyzeInput {
  userId: string
  title: string
  message: string
  /** Category the user chose, if any (a hint for the model). */
  categoryHint?: Category
  /** Skip the duplicate-content cache and use the smarter model (manual re-analyze). */
  force?: boolean
}

export interface Outcome<T> {
  value: T
  source: 'ai' | 'fallback'
  reason?: FailureReason | 'user_rate_limited' | 'injection'
}

const defaultDeps = (): Deps => ({
  client: getGroq(),
  limiter: sharedLimiter,
  cache: sharedCache,
  timeoutMs: env.AI_TIMEOUT_MS,
  models: { fast: env.GROQ_MODEL_FAST, smart: env.GROQ_MODEL_SMART },
})
const sharedLimiter = new UserRateLimiter(env.AI_USER_LIMIT_PER_MIN)
const sharedCache = new TtlCache<Analysis>(60 * 60_000, 500)

// ---- health: drives the "smart sorting limited" hint in the UI ----
const health = { consecutiveFailures: 0, lastReason: null as string | null }
const recordSuccess = () => void (health.consecutiveFailures = 0, health.lastReason = null)
const recordFailure = (reason: string) => void (health.consecutiveFailures++, (health.lastReason = reason))

/** 'ai' while Groq is configured and healthy; 'fallback' with no key or after 3 consecutive failures. */
export const getAiMode = (deps = defaultDeps()): 'ai' | 'fallback' =>
  deps.client && health.consecutiveFailures < 3 ? 'ai' : 'fallback'
export const getAiHealth = () => ({ ...health })
export const resetAiHealthForTests = () => recordSuccess()

/** Never throws: any AI problem degrades to the rule-based result. */
export async function analyzeNotification(input: AnalyzeInput, deps: Deps = defaultDeps()): Promise<Outcome<Analysis>> {
  const rules = classifyWithRules(input)
  const fallback = (reason?: Outcome<Analysis>['reason']): Outcome<Analysis> => ({ value: rules, source: 'fallback', reason })

  // Text aimed at AI systems never reaches the model.
  if (isInjectionAttempt(`${input.title}\n${input.message}`)) return fallback('injection')

  const key = contentHash(input.title, input.message, input.categoryHint)
  if (!input.force) {
    const cached = deps.cache.get(key)
    if (cached) return { value: cached, source: 'ai' }
  }

  if (!deps.client) return fallback('no_key')
  if (!deps.limiter.tryConsume(input.userId)) return fallback('user_rate_limited')

  try {
    const r = await callJson({
      client: deps.client,
      model: input.force ? deps.models.smart : deps.models.fast,
      system: ANALYSIS_SYSTEM_PROMPT,
      user: buildAnalysisUserMessage(input),
      schema: llmAnalysisSchema,
      timeoutMs: deps.timeoutMs,
      sleep: deps.sleep,
    })
    const analysis: Analysis = {
      priority: r.priority,
      reason: r.priorityReason,
      isSpam: r.isSpam,
      spamScore: r.spamScore,
      category: r.category,
      summary: r.summary || null,
    }
    deps.cache.set(key, analysis)
    recordSuccess()
    return { value: analysis, source: 'ai' }
  } catch (err) {
    const reason = err instanceof LlmError ? err.reason : 'error'
    recordFailure(reason)
    // Log the reason only: never the notification text or any key.
    log.warn(`[ai] analysis fell back to rules (${reason})`)
    return fallback(reason)
  }
}

/** One-line summary of a group; falls back to a rule-based line. Never throws. */
export async function summarizeGroup(
  userId: string,
  category: Category,
  items: { title: string; message: string }[],
  deps: Deps = defaultDeps(),
): Promise<Outcome<string>> {
  const rules = summarizeGroupWithRules(category, items.map((i) => i.title))
  if (!deps.client) return { value: rules, source: 'fallback', reason: 'no_key' }
  if (!deps.limiter.tryConsume(userId)) return { value: rules, source: 'fallback', reason: 'user_rate_limited' }
  try {
    const r = await callJson({
      client: deps.client,
      model: deps.models.smart,
      system: GROUP_SYSTEM_PROMPT,
      user: buildGroupUserMessage(items),
      schema: llmGroupSummarySchema,
      timeoutMs: deps.timeoutMs,
      sleep: deps.sleep,
    })
    recordSuccess()
    return { value: r.summary, source: 'ai' }
  } catch (err) {
    const reason = err instanceof LlmError ? err.reason : 'error'
    recordFailure(reason)
    log.warn(`[ai] group summary fell back to rules (${reason})`)
    return { value: rules, source: 'fallback', reason }
  }
}
