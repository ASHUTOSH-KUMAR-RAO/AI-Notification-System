/**
 * Structured (one JSON object per line) logger.
 * Safe by construction: only a message and a sanitized error summary are emitted. Error objects are reduced to
 * name, code and the FIRST line of the message (Prisma appends the failing query, which can contain user data),
 * and arbitrary objects are never serialized, so notification content and secrets cannot leak through here.
 */
type Level = 'info' | 'warn' | 'error'

const firstLine = (s: string) => s.split('\n').find((l) => l.trim())?.slice(0, 200)

function summarize(value: unknown): unknown {
  if (value instanceof Error) {
    const code = (value as { code?: unknown }).code
    return { name: value.name, ...(typeof code === 'string' && { code }), message: firstLine(value.message) }
  }
  if (typeof value === 'string') return firstLine(value)
  return typeof value === 'number' || typeof value === 'boolean' ? value : undefined
}

function emit(level: Level, msg: string, rest: unknown[]) {
  const detail = rest.map(summarize).filter((d) => d !== undefined)
  const line = JSON.stringify({ ts: new Date().toISOString(), level, msg, ...(detail.length && { detail }) })
  ;(level === 'error' ? process.stderr : process.stdout).write(`${line}\n`)
}

export const log = {
  info: (msg: string, ...rest: unknown[]) => emit('info', msg, rest),
  warn: (msg: string, ...rest: unknown[]) => emit('warn', msg, rest),
  error: (msg: string, ...rest: unknown[]) => emit('error', msg, rest),
}
