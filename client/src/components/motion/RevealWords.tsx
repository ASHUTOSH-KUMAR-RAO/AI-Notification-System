import { Fragment } from 'react'
import { motion } from 'framer-motion'
import { useMotionScale } from '@/lib/motion'
import { cn } from '@/lib/utils'

export interface Word {
  text: string
  className?: string
}

/** Headline that reveals word by word (masked rise + stagger). Words wrap normally; shorter travel under reduced motion. */
export function RevealWords({ words, className, delay = 0.1 }: { words: Word[]; className?: string; delay?: number }) {
  const k = useMotionScale()
  return (
    <>
      {words.map((w, i) => (
        <Fragment key={i}>
        <span className="inline-block overflow-hidden pb-[0.12em] align-bottom">
          <motion.span
            className={cn('inline-block', className, w.className)}
            initial={{ y: `${110 * (0.5 + 0.5 * k)}%` }}
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
