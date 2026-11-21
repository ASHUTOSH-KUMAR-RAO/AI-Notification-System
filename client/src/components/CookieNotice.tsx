import { Cookie } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

const KEY = 'notify:cookie-notice'

const dismissed = () => {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

/** Small, non-blocking notice shown on the first visit. Only essential cookies and storage are used. */
export function CookieNotice() {
  const [open, setOpen] = useState(() => !dismissed())
  if (!open) return null

  const close = () => {
    try {
      localStorage.setItem(KEY, '1')
    } catch {
      /* storage unavailable: the notice simply shows again next visit */
    }
    setOpen(false)
  }

  return (
    <section
      aria-label="Cookie notice"
      className="animate-in fade-in slide-in-from-bottom-4 fixed bg-popover/95 backdrop-blur-xl inset-x-3 bottom-3 z-50 flex flex-col gap-3 rounded-2xl border p-4 shadow-soft duration-500 sm:inset-x-auto sm:bottom-4 sm:left-1/2 sm:w-full sm:max-w-md sm:-translate-x-1/2"
    >
      <p className="flex gap-3 text-sm leading-relaxed text-muted-foreground">
        <Cookie className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
        <span>
          Notify only uses essential cookies and browser storage (sign-in, theme, sidebar). No tracking. <Link to="/cookies" className="font-medium text-primary underline underline-offset-4">Cookie Policy</Link>
        </span>
      </p>
      <Button size="sm" onClick={close} className="self-end">
        Got it
      </Button>
    </section>
  )
}
