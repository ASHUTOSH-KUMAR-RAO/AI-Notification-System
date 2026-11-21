import { Bell } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

/** Brand mark. `compact` shows the icon only (collapsed sidebar). */
export function Logo({ className, to = '/', compact }: { className?: string; to?: string; compact?: boolean }) {
  return (
    <Link to={to} aria-label="Notify home" className={cn('flex items-center gap-2.5 rounded-xl font-heading text-lg font-semibold tracking-tight', className)}>
      <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sea-300 to-sea-500 text-sea-950 shadow-[0_6px_18px_-6px_var(--brand)]">
        <Bell className="size-[18px]" />
      </span>
      {!compact && <span>Notify</span>}
    </Link>
  )
}
