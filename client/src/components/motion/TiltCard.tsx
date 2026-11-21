import { useRef, type ComponentProps } from 'react'
import { cn } from '@/lib/utils'

/** Card with a pointer-following glow and a gentle 3D tilt. Desktop (hover + fine pointer) only; no-op elsewhere. */
export function TiltCard({ className, children, max = 5, ...props }: ComponentProps<'article'> & { max?: number }) {
  const ref = useRef<HTMLElement>(null)
  const enabled = () => matchMedia('(hover: hover) and (pointer: fine)').matches && !matchMedia('(prefers-reduced-motion: reduce)').matches

  const onMove = (e: React.PointerEvent<HTMLElement>) => {
    const el = ref.current
    if (!el || !enabled()) return
    const r = el.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width
    const py = (e.clientY - r.top) / r.height
    el.style.setProperty('--px', `${px * 100}%`)
    el.style.setProperty('--py', `${py * 100}%`)
    el.style.transform = `perspective(900px) rotateX(${(0.5 - py) * max}deg) rotateY(${(px - 0.5) * max}deg) translateY(-2px)`
  }
  const onLeave = () => {
    if (ref.current) ref.current.style.transform = ''
  }

  return (
    <article ref={ref} onPointerMove={onMove} onPointerLeave={onLeave} className={cn('tilt-card', className)} {...props}>
      {children}
    </article>
  )
}
