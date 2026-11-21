import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Icon-in-halo illustration, title, hint and optional action. */
export function EmptyState({ icon: Icon, title, description, children, className }: { icon: LucideIcon; title: string; description: string; children?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center gap-3 px-4 py-12 text-center', className)}>
      <span aria-hidden className="relative flex size-16 items-center justify-center rounded-full bg-accent text-primary">
        <span className="absolute inset-0 rounded-full ring-8 ring-accent/50" />
        <Icon className="relative size-7" />
      </span>
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      {children && <div className="mt-2">{children}</div>}
    </div>
  )
}
