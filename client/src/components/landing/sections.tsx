import { Atom, BellRing, Database, Gem, Layers, Moon, Plug, Server, ShieldCheck, Sparkles, Sprout, Waypoints, Zap, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Marquee } from '@/components/motion/Marquee'
import { TiltCard } from '@/components/motion/TiltCard'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

function SectionHead({ eyebrow, title, children }: { eyebrow: string; title: string; children?: ReactNode }) {
  return (
    <div data-reveal className="mx-auto max-w-2xl space-y-4 text-center">
      <p className="inline-flex rounded-full border bg-card/60 px-3.5 py-1.5 text-xs font-semibold tracking-wide text-primary uppercase backdrop-blur">{eyebrow}</p>
      <h2 className="text-3xl font-bold tracking-tight text-balance sm:text-4xl lg:text-5xl">{title}</h2>
      {children && <p className="text-pretty text-muted-foreground sm:text-lg">{children}</p>}
    </div>
  )
}

interface Feature {
  icon: LucideIcon
  title: string
  text: string
  className?: string
  visual?: ReactNode
}

const FEATURES: Feature[] = [
  {
    icon: Sparkles,
    title: 'AI priority',
    text: 'Every notification is read by an LLM that picks High, Medium or Low and tells you why. You can always override it.',
    className: 'md:col-span-2',
    visual: (
      <div aria-hidden className="mt-5 flex flex-wrap gap-2 text-xs">
        <span className="rounded-full bg-destructive/10 px-3 py-1.5 font-medium text-destructive">High · Payment failed</span>
        <span className="rounded-full bg-secondary px-3 py-1.5 font-medium text-secondary-foreground">Medium · Standup in 15 min</span>
        <span className="rounded-full border px-3 py-1.5 text-muted-foreground">Low · Someone liked your post</span>
      </div>
    ),
  },
  { icon: ShieldCheck, title: 'Spam filter', text: 'Scams and prompt-injection attempts are caught and quarantined, with a one-click "Not spam".' },
  { icon: Layers, title: 'Smart grouping', text: 'Twelve likes become one card with an AI summary instead of twelve interruptions.' },
  { icon: Zap, title: 'Real-time delivery', text: 'Socket.io pushes every change to all your tabs instantly, with a polling fallback.', className: 'md:col-span-2' },
  { icon: Moon, title: 'Quiet hours', text: 'Time-zone aware. Only high priority breaks through, if you allow it.' },
  { icon: BellRing, title: 'Multi-channel', text: 'In-app, email and web push, per category, with retries and a daily digest.' },
  { icon: Waypoints, title: 'Personalization', text: 'Notify learns what you open quickly and nudges priority, never more than one level. Your explicit choices always win.', className: 'md:col-span-4' },
]

export function Features() {
  return (
    <section id="features" className="mx-auto w-full max-w-6xl scroll-mt-20 px-4 py-10 sm:px-6 sm:py-16">
      <SectionHead eyebrow="Features" title="Everything between the event and your attention">
        Seven small systems that work together so you only see what matters, when it matters.
      </SectionHead>
      <div data-stagger className="mt-8 grid gap-4 sm:mt-10 md:grid-cols-4">
        {FEATURES.map(({ icon: Icon, title, text, className, visual }) => (
          <TiltCard key={title} data-reveal className={cn('glass rounded-3xl border p-6 shadow-soft sm:p-7', className ?? 'md:col-span-1')}>
            <span aria-hidden className="mb-5 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Icon className="size-6" />
            </span>
            <h3 className="text-lg font-semibold">{title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p>
            {visual}
          </TiltCard>
        ))}
      </div>
    </section>
  )
}

const STEPS = [
  { title: 'A notification arrives', text: 'Your app posts it to the API. It is stored and shown instantly as "Analyzing".' },
  { title: 'AI analyzes it', text: 'Priority, category, spam score and a summary, with rule-based fallback if the AI is down.' },
  { title: 'It is personalized', text: 'Your history and feedback adjust the priority. Your explicit choices always win.' },
  { title: 'Delivered at the right time', text: 'In-app, email or push, respecting quiet hours, per-category rules and the daily digest.' },
]

export function HowItWorks() {
  return (
    <section id="how" className="mx-auto w-full max-w-6xl scroll-mt-20 px-4 py-10 sm:px-6 sm:py-16">
      <SectionHead eyebrow="How it works" title="From raw event to the right alert" />
      <div className="relative mt-8 sm:mt-10">
        {/* connector: vertical on mobile (through the number badges), horizontal from lg; drawn on scroll */}
        <div aria-hidden className="absolute top-6 bottom-6 left-[1.4rem] w-0.5 bg-border lg:inset-x-[12.5%] lg:top-[1.4rem] lg:bottom-auto lg:left-auto lg:h-0.5 lg:w-auto">
          <span data-line-y className="absolute inset-0 origin-top bg-gradient-to-b from-sea-400 to-aqua lg:hidden" />
          <span data-line-x className="absolute inset-0 hidden origin-left bg-gradient-to-r from-sea-400 to-aqua lg:block" />
        </div>
        <ol data-stagger className="grid gap-6 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s.title} data-reveal className="relative grid grid-cols-[2.9rem_1fr] gap-4 lg:block lg:text-center">
              <span aria-hidden className="relative z-10 flex size-[2.9rem] items-center justify-center rounded-full bg-gradient-to-br from-sea-300 to-sea-500 font-heading text-lg font-bold text-sea-950 shadow-[0_8px_22px_-8px_var(--brand)] lg:mx-auto">
                {i + 1}
              </span>
              <div className="glass rounded-3xl border p-5 shadow-soft lg:mt-6">
                <h3 className="font-semibold">{s.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{s.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

const STACK: { icon: LucideIcon; name: string; role: string }[] = [
  { icon: Atom, name: 'React', role: 'Vite, TypeScript, Tailwind' },
  { icon: Server, name: 'Node.js', role: 'Express 5, TypeScript' },
  { icon: Plug, name: 'Socket.io', role: 'Real-time rooms' },
  { icon: Database, name: 'PostgreSQL', role: 'Supabase hosted' },
  { icon: Sprout, name: 'Groq', role: 'Fast LLM inference' },
  { icon: Gem, name: 'Prisma', role: 'Typed data access' },
]

const TICKER = [
  'Payment failed · High',
  'New sign-in detected · High',
  'Standup in 15 minutes · Medium',
  'Order #48101 shipped · Medium',
  'Maya liked your post · Low',
  'Weekend sale: 40% off · Low',
  'Spam blocked · Quarantined',
  '12 likes grouped · AI summary',
]

export function TechStack() {
  return (
    <section id="stack" className="w-full scroll-mt-20 py-10 sm:py-16">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <SectionHead eyebrow="Built with" title="A modern, boring-in-a-good-way stack" />
      </div>
      <div data-reveal className="mt-8 space-y-3 sm:mt-10 sm:space-y-4">
        <Marquee label="Technologies used" duration={45}>
          {STACK.map(({ icon: Icon, name, role }) => (
            <div key={name} className="flex shrink-0 items-center gap-3 rounded-2xl border bg-card/80 px-5 py-4 shadow-soft">
              <span aria-hidden className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="size-5" />
              </span>
              <div>
                <p className="font-medium">{name}</p>
                <p className="text-xs whitespace-nowrap text-muted-foreground">{role}</p>
              </div>
            </div>
          ))}
        </Marquee>
        <Marquee label="Example notifications" duration={60}>
          {TICKER.map((t) => (
            <span key={t} className="shrink-0 rounded-full border bg-card/80 px-5 py-2.5 text-sm whitespace-nowrap text-muted-foreground">
              <span aria-hidden className="mr-2 inline-block size-1.5 rounded-full bg-muted-foreground" />
              {t}
            </span>
          ))}
        </Marquee>
      </div>
    </section>
  )
}

export function FinalCta({ signedIn }: { signedIn: boolean }) {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 pb-6 sm:px-6 sm:pb-8">
      <div data-reveal className="glass relative overflow-hidden rounded-[2rem] border px-6 py-12 text-center shadow-soft sm:px-12 sm:py-16">
        <div aria-hidden className="absolute -top-28 left-1/2 size-96 -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,var(--glow),transparent)]" />
        <h2 className="relative text-3xl font-bold tracking-tight text-balance sm:text-5xl">Stop drowning in notifications</h2>
        <p className="relative mx-auto mt-4 max-w-xl text-pretty text-muted-foreground sm:text-lg">Let AI sort the signal from the noise. Free to try, takes under a minute.</p>
        <div className="relative mt-9 flex flex-wrap justify-center gap-3">
          <Link to={signedIn ? '/dashboard' : '/register'} className={buttonVariants({ size: 'lg' })}>
            {signedIn ? 'Go to Dashboard' : 'Get started free'}
          </Link>
        </div>
      </div>
    </section>
  )
}
