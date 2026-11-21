import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Logo } from '@/components/Logo'
import { ThemeToggle } from '@/components/ThemeToggle'
import { useAuth } from '@/context/AuthContext'
import { API_URL } from '@/lib/api'
import { cn } from '@/lib/utils'

type Health = 'checking' | 'ok' | 'down'

/** One-shot API health probe for the "Status" link. Never throws; any failure reads as "down". */
function useApiHealth(): Health {
  const [state, setState] = useState<Health>('checking')
  useEffect(() => {
    const ctrl = new AbortController()
    fetch(`${API_URL}/health`, { signal: ctrl.signal })
      .then((r) => setState(r.ok ? 'ok' : 'down'))
      .catch((e: unknown) => {
        if (!(e instanceof DOMException && e.name === 'AbortError')) setState('down')
      })
    return () => ctrl.abort()
  }, [])
  return state
}

const linkClass = 'inline-flex min-h-8 items-center rounded-md text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring'

function Column({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <nav aria-label={title} className="min-w-0 lg:min-w-40">
      <h2 className="mb-2 font-heading text-sm font-semibold">{title}</h2>
      <ul className="space-y-0.5">{children}</ul>
    </nav>
  )
}

/**
 * Public-page footer on the page container. Mobile: brand on top, Product and Legal side by side.
 * Desktop: brand on the left, both link columns pushed to the right edge, so the row is balanced edge to edge.
 */
export function Footer() {
  const { user } = useAuth()
  const health = useApiHealth()
  const label = health === 'ok' ? 'All systems operational' : health === 'down' ? 'API unreachable' : 'Checking status'

  return (
    <footer className="mt-auto overflow-hidden">
      <div className="mx-auto w-full max-w-6xl px-4 pt-6 sm:px-6">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-sm space-y-3">
            <Logo />
            <p className="text-sm leading-relaxed text-muted-foreground">Notifications that know what matters. AI ranks them, filters the spam and delivers the rest in real time.</p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:gap-16 lg:gap-24">
            <Column title="Product">
              <li><Link to={{ pathname: '/', hash: 'features' }} className={linkClass}>Features</Link></li>
              <li><Link to={{ pathname: '/', hash: 'how' }} className={linkClass}>How it works</Link></li>
              <li><Link to="/dashboard" className={linkClass}>Dashboard</Link></li>
              <li><Link to={user ? '/dashboard' : '/register'} className={linkClass}>Get started</Link></li>
              <li>
                <a href={`${API_URL}/health`} target="_blank" rel="noopener noreferrer" className={cn(linkClass, 'gap-2')}>
                  <span aria-hidden className={cn('size-2 rounded-full', health === 'ok' ? 'bg-success' : health === 'down' ? 'bg-destructive' : 'bg-muted-foreground')} />
                  Status
                  <span className="sr-only">: {label}</span>
                </a>
              </li>
            </Column>

            <Column title="Legal">
              <li><Link to="/privacy" className={linkClass}>Privacy Policy</Link></li>
              <li><Link to="/terms" className={linkClass}>Terms of Service</Link></li>
              <li><Link to="/cookies" className={linkClass}>Cookie Policy</Link></li>
            </Column>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between gap-4 pt-3 pb-2 text-sm text-muted-foreground">
          <p>Made by Avishka</p>
          <ThemeToggle />
        </div>
      </div>
      <div aria-hidden className="wordmark pointer-events-none -mt-1 h-[clamp(3rem,12vw,9rem)] overflow-hidden select-none" />
    </footer>
  )
}
