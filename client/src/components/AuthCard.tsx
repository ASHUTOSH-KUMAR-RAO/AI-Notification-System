import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Logo } from '@/components/Logo'
import { Seo } from '@/components/Seo'
import { ThemeToggle } from '@/components/ThemeToggle'
import { FeedPreview } from '@/components/landing/FeedPreview'

interface Props {
  title: string
  description: string
  footer: { text: string; linkText: string; to: string }
  children: ReactNode
}

/**
 * Login / register. Mobile: one column with a single logo above the form.
 * Desktop: the animated inbox preview on the left (carrying the logo) and the form on the right. The background is the global one.
 */
export function AuthCard({ title, description, footer, children }: Props) {
  return (
    <div className="grid flex-1 lg:grid-cols-[1.1fr_1fr]">
      <Seo title={title} description={description} />
      <aside aria-label="Product preview" className="relative hidden flex-col justify-center gap-10 p-12 xl:p-16 lg:flex">
        <Logo className="absolute top-8 left-12 xl:left-16" />
        <div className="space-y-4">
          <h2 className="max-w-lg text-4xl font-bold tracking-tight text-balance xl:text-5xl">
            Only the notifications that <span className="text-gradient">matter</span>, right when they do.
          </h2>
          <p className="max-w-md text-lg text-muted-foreground">AI sorts priority, filters spam and groups the noise, in real time.</p>
        </div>
        <FeedPreview className="mx-0" />
      </aside>

      <div className="relative flex flex-col items-center justify-center px-4 py-10 sm:px-6">
        <div className="absolute top-4 right-4 flex items-center gap-2 sm:top-6 sm:right-6">
          <ThemeToggle />
        </div>
        <div className="glass w-full max-w-md space-y-7 rounded-3xl border p-6 shadow-soft sm:p-9">
          <Logo className="lg:hidden" />
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
          {children}
          <p className="text-center text-sm text-muted-foreground">
            {footer.text}{' '}
            <Link to={footer.to} className="font-medium text-primary underline underline-offset-4 hover:text-foreground">
              {footer.linkText}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
