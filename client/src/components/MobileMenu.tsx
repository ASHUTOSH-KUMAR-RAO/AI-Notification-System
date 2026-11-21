import { LogOut, Menu } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, buttonVariants } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils'

const linkClass = 'rounded-xl px-4 py-3.5 text-base font-medium transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring'

/** Hamburger menu shown under 640px. */
export function MobileMenu({ side = 'right' }: { side?: 'left' | 'right' }) {
  const [open, setOpen] = useState(false)
  const { user, logout } = useAuth()
  const close = () => setOpen(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Open menu" className="md:hidden" />}>
        <Menu className="size-5" aria-hidden />
      </SheetTrigger>
      <SheetContent side={side} className="w-[86vw] max-w-sm">
        <SheetHeader>
          <SheetTitle>Menu</SheetTitle>
          <SheetDescription className="sr-only">Site navigation</SheetDescription>
        </SheetHeader>

        <nav aria-label="Mobile" className="flex flex-col gap-1 px-4">
          <Link to="/" onClick={close} className={linkClass}>
            Home
          </Link>
          {user ? (
            <>
              <Link to="/notifications" onClick={close} className={linkClass}>
                Inbox
              </Link>
              <Link to="/dashboard" onClick={close} className={linkClass}>
                Dashboard
              </Link>
              <Link to="/settings" onClick={close} className={linkClass}>
                Settings
              </Link>
            </>
          ) : (
            <>
              <Link to="/login" onClick={close} className={linkClass}>
                Log in
              </Link>
              <Link to="/register" onClick={close} className={cn(buttonVariants(), 'mt-2')}>
                Sign up
              </Link>
            </>
          )}
        </nav>

        {user && (
          <div className="mt-auto space-y-3 p-4">
            <div className="flex items-center gap-3">
              <span
                aria-hidden
                className="flex size-10 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground"
              >
                {user.name.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{user.name}</p>
                <p className="truncate text-xs text-muted-foreground">{user.email}</p>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                close()
                void logout()
              }}
            >
              <LogOut className="size-4" aria-hidden />
              Log out
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}


