import type { Priority } from '@/api/notifications'
import type { Preferences } from '@/api/preferences'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

const OPTIONS: { value: Priority; label: string; hint: string }[] = [
  { value: 'LOW', label: 'Everything', hint: 'Alert me for all priorities' },
  { value: 'MEDIUM', label: 'Medium and above', hint: 'Skip low-priority alerts' },
  { value: 'HIGH', label: 'High priority only', hint: 'Only the urgent ones' },
]

export function PriorityCard({ prefs, onChange }: { prefs: Preferences; onChange: (u: (p: Preferences) => void) => void }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Alert threshold</CardTitle>
        <CardDescription>The minimum priority that shows a pop-up toast or sends a push notification. Everything still lands in your inbox.</CardDescription>
      </CardHeader>
      <CardContent>
        <RadioGroup
          value={prefs.minAlertPriority}
          onValueChange={(v) => onChange((p) => void (p.minAlertPriority = v as Priority))}
          aria-label="Minimum priority for toasts and push"
          className="gap-2"
        >
          {OPTIONS.map((o) => (
            <label
              key={o.value}
              htmlFor={`min-${o.value}`}
              className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 has-[[data-checked]]:border-primary has-[[data-checked]]:bg-muted/40"
            >
              <RadioGroupItem id={`min-${o.value}`} value={o.value} className="mt-0.5" />
              <span className="text-sm">
                <span className="block font-medium">{o.label}</span>
                <span className="text-muted-foreground">{o.hint}</span>
              </span>
            </label>
          ))}
        </RadioGroup>
      </CardContent>
    </Card>
  )
}
