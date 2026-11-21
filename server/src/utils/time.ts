// Time-zone helpers built on Intl only (no date library). All functions are pure.

const formatters = new Map<string, Intl.DateTimeFormat>()
function formatter(timeZone: string) {
  let f = formatters.get(timeZone)
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
    formatters.set(timeZone, f)
  }
  return f
}

export function isValidTimeZone(timeZone: string) {
  try {
    formatter(timeZone)
    return true
  } catch {
    return false
  }
}

export interface LocalParts {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
  /** Minutes since local midnight. */
  minutes: number
  /** Local calendar date, YYYY-MM-DD. */
  date: string
}

export function localParts(date: Date, timeZone: string): LocalParts {
  const p: Record<string, number> = {}
  for (const part of formatter(timeZone).formatToParts(date)) if (part.type !== 'literal') p[part.type] = Number(part.value)
  const pad = (n: number) => String(n).padStart(2, '0')
  return {
    year: p.year,
    month: p.month,
    day: p.day,
    hour: p.hour,
    minute: p.minute,
    second: p.second,
    minutes: p.hour * 60 + p.minute,
    date: `${p.year}-${pad(p.month)}-${pad(p.day)}`,
  }
}

/** Offset of `timeZone` from UTC at `date`, in ms (positive east of Greenwich). */
function offsetMs(date: Date, timeZone: string) {
  const p = localParts(date, timeZone)
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second)
  return asUtc - Math.floor(date.getTime() / 1000) * 1000
}

/** UTC instant of a wall-clock time in `timeZone` (handles DST by re-checking the offset once). */
export function zonedTimeToUtc(y: number, mo: number, d: number, h: number, mi: number, timeZone: string) {
  const guess = Date.UTC(y, mo - 1, d, h, mi)
  const first = offsetMs(new Date(guess), timeZone)
  let utc = guess - first
  const second = offsetMs(new Date(utc), timeZone)
  if (second !== first) utc = guess - second
  return new Date(utc)
}

export const parseHHmm = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

/** The next instant strictly after `from` at which the clock in `timeZone` shows `hhmm`. */
export function nextLocalTime(from: Date, hhmm: string, timeZone: string) {
  const [h, m] = hhmm.split(':').map(Number)
  const p = localParts(from, timeZone)
  const today = zonedTimeToUtc(p.year, p.month, p.day, h, m, timeZone)
  if (today.getTime() > from.getTime()) return today
  const tomorrow = new Date(Date.UTC(p.year, p.month - 1, p.day + 1))
  return zonedTimeToUtc(tomorrow.getUTCFullYear(), tomorrow.getUTCMonth() + 1, tomorrow.getUTCDate(), h, m, timeZone)
}
