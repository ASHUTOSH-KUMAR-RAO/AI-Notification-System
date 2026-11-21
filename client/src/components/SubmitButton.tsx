import { Loader2 } from 'lucide-react'
import type { ComponentProps } from 'react'
import { Button } from '@/components/ui/button'

/** Submit button that disables itself and shows a spinner while `loading`. */
export function SubmitButton({ loading, children, ...props }: ComponentProps<typeof Button> & { loading: boolean }) {
  return (
    <Button type="submit" disabled={loading} {...props}>
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </Button>
  )
}
