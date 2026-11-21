import { useEffect, type RefObject } from 'react'

/**
 * GSAP + ScrollTrigger, loaded lazily (own chunk) only on pages that call this hook.
 *  - `[data-reveal]`          fades/rises in when scrolled into view; siblings inside a `[data-stagger]` parent animate in sequence
 *  - `[data-line-x|y]`        a connector line that draws as the section scrolls (scrubbed)
 * Transform/opacity only. Always on; under prefers-reduced-motion the travel distance is just shorter.
 */
export function useScrollReveal(scope: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = scope.current
    if (!root) return
    const k = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0.4 : 1
    let revert: (() => void) | undefined
    let cancelled = false

    void Promise.all([import('gsap'), import('gsap/ScrollTrigger')]).then(([{ gsap }, { ScrollTrigger }]) => {
      if (cancelled) return
      gsap.registerPlugin(ScrollTrigger)
      const ctx = gsap.context(() => {
        gsap.utils.toArray<HTMLElement>('[data-stagger]').forEach((group) => {
          const items = group.querySelectorAll('[data-reveal]')
          gsap.from(items, {
            opacity: 0, y: 36 * k, duration: 0.8, ease: 'power3.out', stagger: 0.12,
            scrollTrigger: { trigger: group, start: 'top 82%', once: true },
          })
        })
        gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((el) => {
          if (el.closest('[data-stagger]')) return
          gsap.from(el, { opacity: 0, y: 32 * k, duration: 0.8, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 88%', once: true } })
        })
        gsap.utils.toArray<HTMLElement>('[data-line-x], [data-line-y]').forEach((line) => {
          const horizontal = line.hasAttribute('data-line-x')
          gsap.fromTo(
            line,
            horizontal ? { scaleX: 0 } : { scaleY: 0 },
            { scaleX: 1, scaleY: 1, ease: 'none', scrollTrigger: { trigger: line.parentElement, start: 'top 75%', end: 'bottom 60%', scrub: 0.6 } },
          )
        })
      }, root)
      revert = () => ctx.revert()
    })

    return () => {
      cancelled = true
      revert?.()
    }
  }, [scope])
}
