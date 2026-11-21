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
    <nav aria-label={title}>
      <h2 className="mb-3 font-heading text-sm font-semibold">{title}</h2>
      <ul className="space-y-1">{children}</ul>
    </nav>
  )
}

/** Public-page footer: stacked on mobile, four columns on desktop. */
export function Footer() {
  const { user } = useAuth()
  const health = useApiHealth()
  const label = health === 'ok' ? 'All systems operational' : health === 'down' ? 'API unreachable' : 'Checking status'

  return (
    <footer className="mt-auto">
      <div className="mx-auto w-full max-w-6xl px-4 pt-12 pb-8 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr]">
          <div className="max-w-sm space-y-4 sm:col-span-2 lg:col-span-1">
            <Logo />
            <p className="text-sm leading-relaxed text-muted-foreground">Notifications that know what matters. AI ranks them, filters the spam and delivers the rest in real time.</p>
          </div>

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

        <div className="mt-10 flex flex-col-reverse items-start justify-between gap-4 pt-6 text-sm text-muted-foreground sm:flex-row sm:items-center">
          <p>
            © {new Date().getFullYear()} Notify · Made by Avishka
          </p>
          <ThemeToggle />
        </div>
      </div>
    </footer>
  )
}
