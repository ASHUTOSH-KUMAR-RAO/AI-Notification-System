import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Infinite, seamless marquee: the track holds the items twice and slides by exactly half its width (CSS transform only).
 * Pauses on hover, static under reduced motion. The duplicate copy is hidden from assistive tech.
 */
export function Marquee({ children, duration = 40, reverse, className, label }: { children: ReactNode; duration?: number; reverse?: boolean; className?: string; label: string }) {
  return (
    <div className={cn('marquee overflow-hidden', className)} role="group" aria-label={label}>
      <div className="marquee-track gap-3 sm:gap-4" style={{ ['--marquee-duration' as string]: `${duration}s`, animationDirection: reverse ? 'reverse' : 'normal' }}>
        <div className="flex shrink-0 gap-3 pr-3 sm:gap-4 sm:pr-4">{children}</div>
        <div aria-hidden className="flex shrink-0 gap-3 pr-3 sm:gap-4 sm:pr-4">{children}</div>
      </div>
    </div>
  )
}
