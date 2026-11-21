import { Outlet, useLocation } from 'react-router-dom'
import { Link } from 'react-router-dom'
import { Logo } from '@/components/Logo'
import { MobileMenu } from '@/components/MobileMenu'
import { ThemeToggle } from '@/components/ThemeToggle'
import { buttonVariants } from '@/components/ui/button'
import { useAuth } from '@/context/AuthContext'

/** Layout for the landing and auth pages. */
export function PublicLayout() {
  const { user } = useAuth()
  const { pathname } = useLocation()
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        <nav aria-label="Main" className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-4 sm:px-6">
          <Logo />
          <div className="flex items-center gap-1 sm:gap-2">
            <ThemeToggle />
            <div className="hidden items-center gap-2 md:flex">
              {user ? (
                <Link to="/dashboard" className={buttonVariants({ size: 'sm' })}>
                  Go to Dashboard
                </Link>
              ) : (
                <>
                  <Link to="/login" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
                    Log in
                  </Link>
                  <Link to="/register" className={buttonVariants({ size: 'sm' })}>
                    Get started
                  </Link>
                </>
              )}
            </div>
            <MobileMenu />
          </div>
        </nav>
      </header>
      <main id="main" className="flex flex-1 flex-col">
        <div key={pathname} className="animate-in fade-in flex flex-1 flex-col duration-300">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

