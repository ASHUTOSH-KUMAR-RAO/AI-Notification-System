import { Link, useLocation } from 'react-router-dom'
import { Logo } from '@/components/Logo'
import { MobileMenu } from '@/components/MobileMenu'
import { PageTransition } from '@/components/motion/PageTransition'
import { ThemeToggle } from '@/components/ThemeToggle'
import { Footer } from '@/components/shell/Footer'
import { buttonVariants } from '@/components/ui/button'
import { useAuth } from '@/context/AuthContext'

const AUTH_PATHS = ['/login', '/register']

/**
 * Layout for the landing, auth and 404 pages. Auth pages bring their own branding and theme toggle
 * (one logo, no duplicate navbar), every other page gets the glass top bar.
 */
export function PublicLayout() {
  const { user } = useAuth()
  const { pathname } = useLocation()
  const isAuth = AUTH_PATHS.includes(pathname)
  return (
    <div className="flex min-h-dvh flex-col">
      {!isAuth && (
        <header className="glass-bar sticky top-0 z-40">
          <nav aria-label="Main" className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-4 sm:px-6">
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
      )}
      <main id="main" className="flex flex-1 flex-col">
        <PageTransition className="flex flex-1 flex-col" />
      </main>
      {!isAuth && <Footer />}
    </div>
  )
}
