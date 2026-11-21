import { useEffect, useRef, useState } from 'react'

/** Counts up from the previous value to `value`. Always animates (reduced motion only shortens it). */
export function AnimatedNumber({ value, format = (n) => Math.round(n).toLocaleString(), duration = 800 }: { value: number; format?: (n: number) => string; duration?: number }) {
  const [shown, setShown] = useState(value)
  const from = useRef(0)
  const first = useRef(true)

  useEffect(() => {
    const start = first.current ? 0 : from.current
    first.current = false
    if (start === value) {
      from.current = value
      setShown(value)
      return
    }
    let raf = 0
    const t0 = performance.now()
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / duration)
      const v = start + (value - start) * (1 - Math.pow(1 - p, 3))
      from.current = v
      setShown(v)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, duration])

  return <span aria-label={format(value)}>{format(shown)}</span>
}
