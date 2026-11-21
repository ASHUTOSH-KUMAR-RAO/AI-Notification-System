import { Bell } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

export function Logo({ className, to = '/' }: { className?: string; to?: string }) {
  return (
    <Link to={to} className={cn('flex items-center gap-2 rounded-md font-semibold tracking-tight', className)}>
      <span aria-hidden className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-soft">
        <Bell className="size-4" />
      </span>
      Notify
    </Link>
  )
}
