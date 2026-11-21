import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { Seo } from '@/components/Seo'
import { FeedPreview } from '@/components/landing/FeedPreview'
import { Features, FinalCta, HowItWorks, TechStack } from '@/components/landing/sections'
import { RevealWords } from '@/components/motion/RevealWords'
import { buttonVariants } from '@/components/ui/button'
import { useAuth } from '@/context/AuthContext'
import { useScrollReveal } from '@/hooks/useScrollReveal'

const HEADLINE = [{ text: 'Notifications' }, { text: 'that' }, { text: 'know' }, { text: 'what' }, { text: 'matters', className: 'text-gradient' }]

export default function Home() {
  const { user } = useAuth()
  const page = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()
  useScrollReveal(page)
  const fade = (delay: number) =>
    reduce ? {} : { initial: { opacity: 0, y: 18 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] as const } }

  return (
    <div ref={page}>
      <Seo description="Notify uses AI to prioritize, filter and group your notifications, then delivers them in real time to the right channel at the right time." />
      <section className="mx-auto grid w-full max-w-6xl items-center gap-14 px-4 pt-12 pb-16 sm:px-6 sm:pt-16 lg:grid-cols-2 lg:gap-10 lg:pt-24 lg:pb-24">
        <div className="min-w-0 space-y-7">
          <motion.p {...fade(0)} className="glass inline-flex max-w-full items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-medium sm:px-4 sm:text-xs text-muted-foreground shadow-soft">
            <span aria-hidden className="size-1.5 rounded-full bg-success motion-safe:animate-pulse" />
            AI-powered · Real-time · Multi-channel
          </motion.p>
          <h1 className="text-[2.5rem] leading-[1.05] font-bold tracking-tight text-balance sm:text-6xl lg:text-7xl">
            <RevealWords words={HEADLINE} />
          </h1>
          <motion.p {...fade(0.45)} className="max-w-xl text-lg text-pretty text-muted-foreground">
            Notify reads every notification, ranks its priority, filters spam, groups the noise and delivers it in real time, through the right channel, at the right moment.
          </motion.p>
          <motion.div {...fade(0.6)} className="flex flex-col gap-3 sm:flex-row">
            {user ? (
              <Link to="/dashboard" className={buttonVariants({ size: 'lg' })}>
                Go to Dashboard <ArrowRight className="size-5" aria-hidden />
              </Link>
            ) : (
              <>
                <Link to="/register" className={buttonVariants({ size: 'lg' })}>
                  Get started <ArrowRight className="size-5" aria-hidden />
                </Link>
                <Link to="/login" className={buttonVariants({ size: 'lg', variant: 'outline' })}>
                  Log in
                </Link>
              </>
            )}
          </motion.div>
        </div>
        <motion.div {...fade(0.35)} className="min-w-0">
          <FeedPreview />
        </motion.div>
      </section>
      <Features />
      <HowItWorks />
      <TechStack />
      <FinalCta signedIn={!!user} />
    </div>
  )
}
