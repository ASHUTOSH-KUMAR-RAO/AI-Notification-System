import { Info } from 'lucide-react'
import { useAiStatus } from '@/hooks/useNotifications'

/** Shown only while the AI is unavailable (no key, or repeated failures): everything still works on basic rules. */
export function AiStatusHint() {
  const { data } = useAiStatus()
  if (!data || data.mode === 'ai') return null

  return (
    <p role="status" className="flex items-start gap-2 rounded-lg border border-dashed bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
      <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
      Smart sorting is limited right now. Notifications are being sorted with basic rules.
    </p>
  )
}
