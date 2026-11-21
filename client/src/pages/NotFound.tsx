import { Compass } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Seo } from '@/components/Seo'
import { buttonVariants } from '@/components/ui/button'
import { useAuth } from '@/context/AuthContext'

export default function NotFound() {
  const { user } = useAuth()
  return (
    <section className="relative flex flex-1 flex-col items-center justify-center gap-5 px-4 py-20 text-center">
      <Seo title="Page not found" description="The page you are looking for does not exist." />
      <span aria-hidden className="float-y flex size-16 items-center justify-center rounded-2xl bg-accent text-primary shadow-soft">
        <Compass className="size-8" />
      </span>
      <p className="text-gradient font-heading text-8xl font-bold tracking-tight">404</p>
      <h1 className="text-2xl font-semibold">This page wandered off</h1>
      <p className="max-w-sm text-muted-foreground">The link may be broken or the page may have moved.</p>
      <Link to={user ? '/dashboard' : '/'} className={buttonVariants()}>
        {user ? 'Back to dashboard' : 'Back to home'}
      </Link>
    </section>
  )
}
