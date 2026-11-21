import { Atom, BellRing, Database, Gem, Layers, Moon, Plug, Server, ShieldCheck, Sparkles, Sprout, Waypoints, Zap, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { buttonVariants } from '@/components/ui/button'
import { Logo } from '@/components/Logo'
import { cn } from '@/lib/utils'

function SectionHead({ eyebrow, title, children }: { eyebrow: string; title: string; children?: ReactNode }) {
  return (
    <div className="mx-auto max-w-2xl space-y-3 text-center">
      <p className="text-sm font-medium text-primary">{eyebrow}</p>
      <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h2>
      {children && <p className="text-muted-foreground">{children}</p>}
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
      <div aria-hidden className="mt-4 flex flex-wrap gap-2 text-xs">
        <span className="rounded-full bg-destructive/10 px-2.5 py-1 font-medium text-destructive">High · Payment failed</span>
        <span className="rounded-full bg-secondary px-2.5 py-1 font-medium text-secondary-foreground">Medium · Standup in 15 min</span>
        <span className="rounded-full border px-2.5 py-1 text-muted-foreground">Low · Someone liked your post</span>
      </div>
    ),
  },
  { icon: ShieldCheck, title: 'Spam filter', text: 'Scams and prompt-injection attempts are caught and quarantined, with a one-click "Not spam".', className: 'md:col-span-1' },
  { icon: Layers, title: 'Smart grouping', text: 'Twelve likes become one card with an AI summary instead of twelve interruptions.' },
  { icon: Zap, title: 'Real-time delivery', text: 'Socket.io pushes every change to all your tabs instantly, with a polling fallback.', className: 'md:col-span-2' },
  { icon: Moon, title: 'Quiet hours', text: 'Time-zone aware. Only high priority breaks through, if you allow it.' },
  { icon: BellRing, title: 'Multi-channel', text: 'In-app, email and web push, per category, with retries and a daily digest.' },
  { icon: Waypoints, title: 'Personalization', text: 'Notify learns what you open quickly and nudges priority, never more than one level. Your explicit choices always win.', className: 'md:col-span-4' },
]

export function Features() {
  return (
    <section id="features" className="mx-auto w-full max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6">
      <SectionHead eyebrow="Features" title="Everything between the event and your attention">
        Seven small systems that work together so you only see what matters, when it matters.
      </SectionHead>
      <div className="mt-12 grid gap-4 md:grid-cols-4">
        {FEATURES.map(({ icon: Icon, title, text, className, visual }) => (
          <article key={title} className={cn('group rounded-2xl border bg-card p-6 shadow-soft transition-colors motion-safe:hover:-translate-y-0.5 hover:border-primary/40', className)}>
            <span aria-hidden className="mb-4 flex size-10 items-center justify-center rounded-xl bg-accent text-primary">
              <Icon className="size-5" />
            </span>
            <h3 className="font-semibold">{title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{text}</p>
            {visual}
          </article>
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
    <section id="how" className="border-y bg-muted/40 py-20">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <SectionHead eyebrow="How it works" title="From raw event to the right alert" />
        <ol className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s.title} className="relative rounded-2xl border bg-card p-6 shadow-soft">
              <span aria-hidden className="mb-4 flex size-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                {i + 1}
              </span>
              <h3 className="font-semibold">{s.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{s.text}</p>
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

export function TechStack() {
  return (
    <section id="stack" className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
      <SectionHead eyebrow="Built with" title="A modern, boring-in-a-good-way stack" />
      <ul className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {STACK.map(({ icon: Icon, name, role }) => (
          <li key={name} className="flex flex-col items-center gap-2 rounded-2xl border bg-card p-5 text-center shadow-soft">
            <span aria-hidden className="flex size-11 items-center justify-center rounded-xl bg-accent text-primary">
              <Icon className="size-5" />
            </span>
            <span className="font-medium">{name}</span>
            <span className="text-xs text-muted-foreground">{role}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function FinalCta({ signedIn }: { signedIn: boolean }) {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 pb-20 sm:px-6">
      <div className="relative overflow-hidden rounded-3xl bg-primary px-6 py-14 text-center text-primary-foreground sm:px-12">
        <div aria-hidden className="absolute -top-24 -right-24 size-72 rounded-full bg-white/10 blur-3xl" />
        <h2 className="relative text-3xl font-bold tracking-tight sm:text-4xl">Stop drowning in notifications</h2>
        <p className="relative mx-auto mt-3 max-w-xl text-primary-foreground/85">Let AI sort the signal from the noise. Free to try, takes under a minute.</p>
        <div className="relative mt-8 flex flex-wrap justify-center gap-3">
          <Link to={signedIn ? '/dashboard' : '/register'} className={buttonVariants({ size: 'lg', variant: 'secondary' })}>
            {signedIn ? 'Go to Dashboard' : 'Get started free'}
          </Link>
        </div>
      </div>
    </section>
  )
}

export function Footer() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:px-6">
        <Logo />
        <p>
          Made by Avishka ·{' '}
          <a href="https://github.com/ASHUTOSH-KUMAR-RAO/AI-Notification-System" target="_blank" rel="noopener noreferrer" className="font-medium text-foreground underline-offset-4 hover:underline">
            GitHub
          </a>
        </p>
      </div>
    </footer>
  )
}
