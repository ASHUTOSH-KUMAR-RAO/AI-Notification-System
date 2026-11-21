import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Seo } from '@/components/Seo'
import { FeedPreview } from '@/components/landing/FeedPreview'
import { Features, FinalCta, Footer, HowItWorks, TechStack } from '@/components/landing/sections'
import { buttonVariants } from '@/components/ui/button'
import { useAuth } from '@/context/AuthContext'

export default function Home() {
  const { user } = useAuth()

  return (
    <>
      <Seo description="Notify uses AI to prioritize, filter and group your notifications, then delivers them in real time to the right channel at the right time." />
      <section className="relative overflow-hidden">
        <div aria-hidden className="bg-grid absolute inset-0 -z-10" />
        <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
          <div className="animate-in fade-in slide-in-from-bottom-3 space-y-6 duration-700">
            <p className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-soft">
              <span aria-hidden className="size-1.5 rounded-full bg-success" />
              AI-powered · Real-time · Multi-channel
            </p>
            <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-5xl lg:text-6xl">
              Notifications that know what <span className="text-gradient">matters</span>
            </h1>
            <p className="max-w-xl text-lg text-pretty text-muted-foreground">
              Notify reads every notification, ranks its priority, filters spam, groups the noise and delivers it in real time, through the right channel, at the right moment.
            </p>
            <div className="flex flex-wrap gap-3">
              {user ? (
                <Link to="/dashboard" className={buttonVariants({ size: 'lg' })}>
                  Go to Dashboard <ArrowRight className="size-4" aria-hidden />
                </Link>
              ) : (
                <>
                  <Link to="/register" className={buttonVariants({ size: 'lg' })}>
                    Get started <ArrowRight className="size-4" aria-hidden />
                  </Link>
                  <Link to="/login" className={buttonVariants({ size: 'lg', variant: 'outline' })}>
                    Log in
                  </Link>
                </>
              )}
            </div>
          </div>
          <FeedPreview />
        </div>
      </section>
      <Features />
      <HowItWorks />
      <TechStack />
      <FinalCta signedIn={!!user} />
      <Footer />
    </>
  )
}
