import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export interface Option<T extends string> {
  value: T
  label: string
}

interface Props<T extends string> {
  value: T
  onChange: (value: T) => void
  options: Option<T>[]
  id?: string
  'aria-label'?: string
  className?: string
}

/** Thin wrapper over shadcn Select so callers deal in plain string values and label lists. */
export function SimpleSelect<T extends string>({ value, onChange, options, id, className, ...rest }: Props<T>) {
  return (
    <Select items={options} value={value} onValueChange={(v) => v && onChange(v as T)}>
      <SelectTrigger id={id} className={className} aria-label={rest['aria-label']}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

