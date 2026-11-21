import { Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import { useController, type Control, type FieldValues, type Path } from 'react-hook-form'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

interface Props<T extends FieldValues> {
  control: Control<T>
  name: Path<T>
  label: string
  type?: 'text' | 'email' | 'password'
  autoComplete?: string
  placeholder?: string
  multiline?: boolean
}

/** Label + input + inline error wired to react-hook-form; password type gets a show/hide toggle. */
export function TextField<T extends FieldValues>({
  control,
  name,
  label,
  type = 'text',
  autoComplete,
  placeholder,
  multiline,
}: Props<T>) {
  const { field, fieldState } = useController({ control, name })
  const [shown, setShown] = useState(false)
  const isPassword = type === 'password'
  const id = `field-${name}`
  const errorId = fieldState.invalid ? `${id}-error` : undefined

  return (
    <Field data-invalid={fieldState.invalid}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {multiline ? (
        <Textarea
          {...field}
          id={id}
          rows={4}
          placeholder={placeholder}
          aria-invalid={fieldState.invalid}
          aria-describedby={errorId}
        />
      ) : (
        <div className="relative">
          <Input
            {...field}
            id={id}
            type={isPassword && shown ? 'text' : type}
            autoComplete={autoComplete}
            placeholder={placeholder}
            aria-invalid={fieldState.invalid}
            aria-describedby={errorId}
            className={isPassword ? 'pr-10' : undefined}
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => setShown((s) => !s)}
              aria-label={shown ? 'Hide password' : 'Show password'}
              aria-pressed={shown}
              className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-md text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
            >
              {shown ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
            </button>
          )}
        </div>
      )}
      {fieldState.invalid && <FieldError id={errorId} errors={[fieldState.error]} />}
    </Field>
  )
}
