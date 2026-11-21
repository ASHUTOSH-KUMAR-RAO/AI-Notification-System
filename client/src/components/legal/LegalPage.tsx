import type { ReactNode } from 'react'
import { Seo } from '@/components/Seo'

export interface LegalSection {
  heading: string
  body: ReactNode
}

interface Props {
  title: string
  description: string
  updated: string
  sections: LegalSection[]
}

/** Shared layout for the Privacy, Terms and Cookie pages. */
export function LegalPage({ title, description, updated, sections }: Props) {
  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-20">
      <Seo title={title} description={description} />
      <header className="space-y-4">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{title}</h1>
        <p className="text-sm text-muted-foreground">Last updated: {updated}</p>
        <p className="glass rounded-2xl border p-4 text-sm leading-relaxed text-muted-foreground">
          Notify is a portfolio project, not a commercial service. This page describes what the app really does so you can decide whether to try it. Please do not
          send real personal, financial or confidential information through it.
        </p>
      </header>
      <div className="mt-10 space-y-10">
        {sections.map((s) => (
          <section key={s.heading} aria-labelledby={`h-${s.heading.replace(/\W+/g, '-').toLowerCase()}`} className="space-y-3">
            <h2 id={`h-${s.heading.replace(/\W+/g, '-').toLowerCase()}`} className="text-xl font-semibold tracking-tight sm:text-2xl">
              {s.heading}
            </h2>
            <div className="space-y-3 leading-relaxed text-muted-foreground [&_a]:font-medium [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4 [&_code]:rounded [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.85em] [&_code]:text-foreground [&_li]:pl-1 [&_strong]:font-semibold [&_strong]:text-foreground [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
              {s.body}
            </div>
          </section>
        ))}
      </div>
    </article>
  )
}
