import Groq from 'groq-sdk'
import type { ZodType } from 'zod'
import { env } from '../../config/env'

/** The tiny slice of the Groq client we use, so tests can pass a fake. */
export interface GroqLike {
  chat: {
    completions: {
      create(body: unknown, options?: { signal?: AbortSignal }): Promise<{ choices: { message: { content: string | null } }[] }>
    }
  }
}

let client: GroqLike | null | undefined

/** Null when no API key is configured (the app then runs on the rule-based fallback). */
export function getGroq(): GroqLike | null {
  if (client === undefined) {
    client = env.GROQ_API_KEY
      ? (new Groq({ apiKey: env.GROQ_API_KEY, baseURL: env.GROQ_BASE_URL, maxRetries: 0 }) as unknown as GroqLike)
      : null
  }
  return client
}

export const isAiEnabled = () => getGroq() !== null

export type FailureReason = 'no_key' | 'timeout' | 'rate_limited' | 'server_error' | 'invalid_output' | 'error'

export class LlmError extends Error {
  constructor(public readonly reason: FailureReason, message?: string) {
    super(message ?? reason)
  }
}

export interface CallOptions<T> {
  client: GroqLike | null
  model: string
  system: string
  user: string
  schema: ZodType<T>
  timeoutMs: number
  maxTokens?: number
  sleep?: (ms: number) => Promise<void>
}

const MAX_ATTEMPTS = 3 // initial try + 2 retries for transient errors
const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

function classify(err: unknown): LlmError {
  if (err instanceof LlmError) return err
  const e = err as { status?: number; name?: string; message?: string }
  if (e?.status === 429) return new LlmError('rate_limited')
  if (typeof e?.status === 'number' && e.status >= 500) return new LlmError('server_error')
  if (typeof e?.status === 'number') return new LlmError('error', `status ${e.status}`) // 4xx other than 429: not retryable
  if (/timeout|abort/i.test(`${e?.name} ${e?.message}`)) return new LlmError('timeout')
  return new LlmError('server_error', 'network error') // connection reset etc.: treat as transient
}

const retryable = (r: FailureReason) => r === 'timeout' || r === 'rate_limited' || r === 'server_error'

/**
 * One JSON-mode chat completion with: per-attempt timeout, exponential backoff on 429/5xx/timeouts,
 * and ONE extra retry when the output is not valid JSON for the schema. Throws LlmError when all of that fails.
 */
export async function callJson<T>(opts: CallOptions<T>): Promise<T> {
  if (!opts.client) throw new LlmError('no_key')
  const sleep = opts.sleep ?? defaultSleep
  let invalidRetried = false

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout> | undefined
    try {
      const request = opts.client.chat.completions.create(
        {
          model: opts.model,
          temperature: 0,
          max_tokens: opts.maxTokens ?? 300,
          response_format: { type: 'json_object' },
          // gpt-oss models spend max_tokens on hidden reasoning unless told to keep it short.
          ...(opts.model.startsWith('openai/gpt-oss') && { reasoning_effort: 'low' }),
          messages: [
            { role: 'system', content: opts.system },
            { role: 'user', content: opts.user },
          ],
        },
        { signal: controller.signal },
      )
      const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          controller.abort()
          reject(new LlmError('timeout'))
        }, opts.timeoutMs)
      })
      const res = await Promise.race([request, timeout])

      try {
        return opts.schema.parse(JSON.parse(res.choices[0]?.message?.content ?? ''))
      } catch {
        if (invalidRetried) throw new LlmError('invalid_output')
        invalidRetried = true
        attempt-- // the invalid-output retry does not consume a transient-error attempt
        continue
      }
    } catch (err) {
      const e = classify(err)
      if (!retryable(e.reason) || attempt === MAX_ATTEMPTS - 1) throw e
      await sleep(250 * 2 ** attempt) // 250ms, 500ms
    } finally {
      clearTimeout(timer)
    }
  }
  throw new LlmError('error')
}
