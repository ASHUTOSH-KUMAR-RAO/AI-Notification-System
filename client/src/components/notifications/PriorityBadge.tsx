import { Sparkles } from 'lucide-react'
import type { Notification } from '@/api/notifications'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { PRIORITY_META } from '@/lib/notificationMeta'

function explain(n: Notification): string {
  if (n.prioritySetByUser) return 'Priority set by you.'
  switch (n.aiStatus) {
    case 'PENDING':
      return 'Provisional priority from basic rules. The AI is still analyzing this notification.'
    case 'DONE':
      return `AI: ${n.aiPriorityReason ?? 'Priority chosen by AI.'}`
    case 'FALLBACK':
      return `${n.aiPriorityReason ?? 'Estimated priority.'} (Basic rules: AI was unavailable.)`
    case 'FAILED':
      return 'AI analysis failed. Use "Re-analyze" to try again.'
  }
}

/** Priority badge; a sparkle marks AI-chosen priorities and the tooltip explains the decision. */
export function PriorityBadge({ n }: { n: Notification }) {
  const meta = PRIORITY_META[n.priority]
  const byAi = !n.prioritySetByUser && n.aiStatus === 'DONE'
  const tip =
    n.personalizationReason && !n.prioritySetByUser ? `${explain(n)} Personalized for you: ${n.personalizationReason}.` : explain(n)

  return (
    <>
      <Tooltip>
        <TooltipTrigger
          render={
            <span
              tabIndex={0}
              aria-label={`${meta.label} priority. ${tip}`}
              className="rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          }
        >
          <Badge variant={meta.variant}>
            {byAi && <Sparkles className="size-3" aria-hidden />}
            {meta.label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-64">{tip}</TooltipContent>
      </Tooltip>
      {n.aiStatus === 'PENDING' && (
        <span
          role="status"
          className="ai-shimmer inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs text-muted-foreground"
        >
          <Sparkles className="size-3" aria-hidden />
          Analyzing...
        </span>
      )}
    </>
  )
}

