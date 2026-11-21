import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Infinite marquee moving LEFT TO RIGHT. The track holds four copies of the items and slides by exactly half
 * (two copies), so the loop is seamless and the strip still covers ultra-wide screens. Pauses on hover.
 * Under reduced motion it becomes a static, wrapped list (extra copies hidden). Only the first copy is exposed to assistive tech.
 */
export function Marquee({ children, duration = 40, className, label }: { children: ReactNode; duration?: number; className?: string; label: string }) {
  return (
    <div className={cn('marquee overflow-hidden', className)} role="group" aria-label={label}>
      <div className="marquee-track" style={{ ['--marquee-duration' as string]: `${duration}s` }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} aria-hidden={i > 0 || undefined} className={cn('flex w-max shrink-0 gap-3 pr-3 sm:gap-4 sm:pr-4', i > 0 && 'marquee-dup')}>
            {children}
          </div>
        ))}
      </div>
    </div>
  )
}
