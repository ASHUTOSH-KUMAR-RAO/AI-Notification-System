import { Fragment } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'

export interface Word {
  text: string
  className?: string
}

/** Headline that reveals word by word (masked rise + stagger). Words wrap normally; static under reduced motion. */
export function RevealWords({ words, className, delay = 0.1 }: { words: Word[]; className?: string; delay?: number }) {
  const reduce = useReducedMotion()
  return (
    <>
      {words.map((w, i) => (
        <Fragment key={i}>
        <span className="inline-block overflow-hidden pb-[0.12em] align-bottom">
          <motion.span
            className={cn('inline-block', className, w.className)}
            initial={reduce ? false : { y: '110%' }}
            animate={{ y: 0 }}
            transition={{ duration: 0.7, delay: delay + i * 0.07, ease: [0.22, 1, 0.36, 1] }}
          >
            {w.text}
          </motion.span>
        </span>
        {i < words.length - 1 ? ' ' : ''}
        </Fragment>
      ))}
    </>
  )
}
