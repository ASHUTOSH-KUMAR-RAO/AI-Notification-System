/** 2482238 -> "41m", 5_400_000 -> "1h 30m". */
export function formatDuration(ms: number | null): string {
  if (ms == null) return '–'
  const s = ms / 1000
  if (s < 60) return `${Math.round(s)}s`
  const m = s / 60
  if (m < 60) return `${Math.round(m)}m`
  const h = m / 60
  if (h < 48) return `${Math.floor(h)}h ${Math.round(m % 60)}m`
  return `${Math.round(h / 24)}d`
}

export const pct = (v: number, digits = 0) => `${(v * 100).toFixed(digits)}%`

/** Relative change vs the previous period; null when there is nothing to compare with. */
export const change = (cur: number, prev: number): number | null => (prev === 0 ? (cur === 0 ? 0 : null) : (cur - prev) / prev)
