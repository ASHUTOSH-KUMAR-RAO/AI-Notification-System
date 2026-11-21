import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Logo } from '@/components/Logo'
import { Seo } from '@/components/Seo'
import { FeedPreview } from '@/components/landing/FeedPreview'

interface Props {
  title: string
  description: string
  footer: { text: string; linkText: string; to: string }
  children: ReactNode
}

/** Split layout for login/register: product visual on large screens, form on the right. */
export function AuthCard({ title, description, footer, children }: Props) {
  return (
    <div className="grid flex-1 lg:grid-cols-2">
      <Seo title={title} description={description} />
      <aside aria-label="Product preview" className="relative hidden flex-col justify-center gap-10 overflow-hidden border-r bg-muted/40 p-12 lg:flex">
        <div aria-hidden className="bg-grid absolute inset-0 -z-0" />
        <div className="relative space-y-3">
          <Logo className="text-lg" />
          <h2 className="max-w-md text-3xl font-bold tracking-tight">
            Only the notifications that <span className="text-gradient">matter</span>, right when they do.
          </h2>
          <p className="max-w-md text-muted-foreground">AI sorts priority, filters spam and groups the noise, in real time.</p>
        </div>
        <div className="relative">
          <FeedPreview />
        </div>
      </aside>

      <div className="flex items-center justify-center px-4 py-10 sm:px-6">
        <div className="w-full max-w-sm animate-in fade-in slide-in-from-bottom-3 space-y-6 duration-500">
          <div className="space-y-1.5">
            <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
          {children}
          <p className="text-center text-sm text-muted-foreground">
            {footer.text}{' '}
            <Link to={footer.to} className="font-medium text-foreground underline underline-offset-4">
              {footer.linkText}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
