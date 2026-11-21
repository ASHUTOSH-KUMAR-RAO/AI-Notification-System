import { motion, useReducedMotion } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { ConnectionStatus } from '@/components/ConnectionStatus'
import { Logo } from '@/components/Logo'
import { MobileMenu } from '@/components/MobileMenu'
import { PageTransition } from '@/components/motion/PageTransition'
import { QuietIndicator } from '@/components/QuietIndicator'
import { ThemeToggle } from '@/components/ThemeToggle'
import { NotificationBell } from '@/components/notifications/NotificationBell'
import { APP_NAV } from '@/components/shell/nav'
import { UserMenu } from '@/components/shell/UserMenu'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useUnreadCount } from '@/hooks/useNotifications'
import { useSidebarCollapsed } from '@/lib/useSidebar'
import { cn } from '@/lib/utils'

const EXPANDED = 264
const COLLAPSED = 84

function NavItem({ to, label, icon: Icon, collapsed, badge }: { to: string; label: string; icon: (typeof APP_NAV)[number]['icon']; collapsed: boolean; badge: number }) {
  const link = (
    <NavLink
      to={to}
      aria-label={collapsed ? label : undefined}
      className={({ isActive }) =>
        cn(
          'relative flex h-12 items-center gap-3 rounded-xl px-[1.05rem] text-sm font-medium transition-colors',
          isActive ? 'text-accent-foreground' : 'text-muted-foreground hover:text-foreground',
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && <motion.span layoutId="nav-active" aria-hidden className="absolute inset-0 -z-10 rounded-xl border bg-accent shadow-soft" transition={{ type: 'spring', stiffness: 420, damping: 36 }} />}
          <span className="relative shrink-0">
            <Icon className="size-5" aria-hidden />
            {collapsed && badge > 0 && <span aria-label={`${badge} unread`} className="absolute -top-1 -right-1 size-2.5 rounded-full bg-primary ring-2 ring-background" />}
          </span>
          {!collapsed && <span className="truncate">{label}</span>}
          {!collapsed && badge > 0 && (
            <span className="ml-auto rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground" aria-label={`${badge} unread`}>
              {badge > 99 ? '99+' : badge}
            </span>
          )}
        </>
      )}
    </NavLink>
  )
  if (!collapsed) return link
  return (
    <Tooltip>
      <TooltipTrigger render={<div />}>{link}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  )
}

function Sidebar() {
  const { data: unread = 0 } = useUnreadCount()
  const [collapsed, toggle] = useSidebarCollapsed()
  const reduce = useReducedMotion()
  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? COLLAPSED : EXPANDED }}
      transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 360, damping: 34 }}
      className="sticky top-0 hidden h-dvh shrink-0 p-3 md:block"
    >
      <TooltipProvider>
        <div className="glass flex h-full flex-col gap-6 overflow-hidden rounded-2xl border p-3 shadow-soft">
          <Logo to="/dashboard" compact={collapsed} className="h-12 px-1.5" />
          <nav aria-label="Main" id="app-sidebar" className="flex flex-col gap-1.5">
            {APP_NAV.map((item) => (
              <NavItem key={item.to} {...item} collapsed={collapsed} badge={item.to === '/notifications' ? unread : 0} />
            ))}
          </nav>
          <Button
            variant="ghost"
            size={collapsed ? 'icon' : 'default'}
            onClick={toggle}
            aria-expanded={!collapsed}
            aria-controls="app-sidebar"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={cn('mt-auto text-muted-foreground', collapsed ? 'mx-auto' : 'justify-start px-4')}
          >
            {collapsed ? <ChevronRight className="size-5" aria-hidden /> : <ChevronLeft className="size-5" aria-hidden />}
            {!collapsed && 'Collapse'}
          </Button>
        </div>
      </TooltipProvider>
    </motion.aside>
  )
}

/** Signed-in layout: collapsible sidebar on desktop, drawer on mobile, glass top bar with live status, bell and user menu. */
export function AppShell() {
  return (
    <div className="flex min-h-dvh">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="glass-bar sticky top-0 z-40 flex h-16 items-center justify-between gap-2 px-4 sm:px-6">
          <div className="flex items-center gap-1 md:hidden">
            <MobileMenu side="left" />
            <Logo to="/dashboard" compact className="ml-1" />
          </div>
          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <QuietIndicator />
            <ConnectionStatus />
            <ThemeToggle />
            <NotificationBell />
            <div className="hidden md:block">
              <UserMenu />
            </div>
          </div>
        </header>
        <main id="main" className="mx-auto flex w-full max-w-6xl min-w-0 flex-1 flex-col px-4 py-6 sm:px-6 md:py-10">
          <PageTransition className="flex flex-1 flex-col" />
        </main>
      </div>
    </div>
  )
}
