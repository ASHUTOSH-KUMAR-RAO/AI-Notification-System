import { Outlet, useLocation } from 'react-router-dom'
import { NavLink } from 'react-router-dom'
import { ConnectionStatus } from '@/components/ConnectionStatus'
import { Logo } from '@/components/Logo'
import { MobileMenu } from '@/components/MobileMenu'
import { QuietIndicator } from '@/components/QuietIndicator'
import { ThemeToggle } from '@/components/ThemeToggle'
import { NotificationBell } from '@/components/notifications/NotificationBell'
import { APP_NAV } from '@/components/shell/nav'
import { UserMenu } from '@/components/shell/UserMenu'
import { useUnreadCount } from '@/hooks/useNotifications'
import { cn } from '@/lib/utils'

function Sidebar() {
  const { data: unread = 0 } = useUnreadCount()
  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col gap-6 border-r bg-sidebar p-4 md:flex">
      <Logo to="/dashboard" className="px-2 pt-1 text-lg" />
      <nav aria-label="Main" className="flex flex-col gap-1">
        {APP_NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )
            }
          >
            <Icon className="size-4" aria-hidden />
            {label}
            {to === '/notifications' && unread > 0 && (
              <span className="ml-auto rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground" aria-label={`${unread} unread`}>
                {unread > 99 ? '99+' : unread}
              </span>
            )}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}

/** Signed-in layout: sidebar on desktop, hamburger sheet on mobile, top bar with live status, bell and user menu. */
export function AppShell() {
  const { pathname } = useLocation()
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-2 border-b bg-background/80 px-4 backdrop-blur sm:px-6">
          <div className="flex items-center gap-2 md:hidden">
            <Logo to="/dashboard" />
          </div>
          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <QuietIndicator />
            <ConnectionStatus />
            <ThemeToggle />
            <NotificationBell />
            <div className="hidden md:block">
              <UserMenu />
            </div>
            <MobileMenu />
          </div>
        </header>
        <main id="main" className="mx-auto flex w-full max-w-6xl min-w-0 flex-1 flex-col px-4 py-6 sm:px-6 md:py-10">
          <div key={pathname} className="animate-in fade-in slide-in-from-bottom-1 flex flex-1 flex-col duration-300">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
