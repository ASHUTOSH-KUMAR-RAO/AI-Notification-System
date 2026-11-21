import { useEffect, useRef } from 'react'

/**
 * One fixed background for the whole app: grid + soft sea green glows + (desktop only) a spotlight that follows the pointer.
 * Sections never paint their own background, so scrolling never shows a seam.
 */
export function Backdrop() {
  const spot = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = spot.current
    if (!el) return
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)')
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (!fine.matches || reduced.matches) return
    let raf = 0
    let x = 0
    let y = 0
    const move = (e: PointerEvent) => {
      x = e.clientX
      y = e.clientY
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        el.style.setProperty('--mx', `${x}px`)
        el.style.setProperty('--my', `${y}px`)
        el.dataset.on = 'true'
      })
    }
    const leave = () => (el.dataset.on = 'false')
    window.addEventListener('pointermove', move, { passive: true })
    document.documentElement.addEventListener('pointerleave', leave)
    return () => {
      window.removeEventListener('pointermove', move)
      document.documentElement.removeEventListener('pointerleave', leave)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <div aria-hidden className="backdrop">
      <div className="backdrop-glow g1" />
      <div className="backdrop-glow g2" />
      <div className="backdrop-glow g3" />
      <div className="backdrop-grid" />
      <div ref={spot} className="backdrop-spot" data-on="false" />
    </div>
  )
}
