import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { cloneElement, type ReactElement } from 'react'
import { useLocation, useOutlet } from 'react-router-dom'

/**
 * Route transition (fade + slight rise). `useOutlet` is frozen while the exiting page animates out,
 * so the old page does not flash the new route's content.
 */
export function PageTransition({ className }: { className?: string }) {
  const { pathname } = useLocation()
  const outlet = useOutlet()
  const reduce = useReducedMotion()
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        className={className}
        initial={reduce ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reduce ? undefined : { opacity: 0, y: -8 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      >
        {outlet && cloneElement(outlet as ReactElement)}
      </motion.div>
    </AnimatePresence>
  )
}
