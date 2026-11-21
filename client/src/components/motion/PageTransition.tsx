import { AnimatePresence, motion } from 'framer-motion'
import { cloneElement, type ReactElement } from 'react'
import { useLocation, useOutlet } from 'react-router-dom'
import { useMotionScale } from '@/lib/motion'

/**
 * Route transition (fade + slight rise). `useOutlet` is frozen while the exiting page animates out,
 * so the old page does not flash the new route's content.
 */
export function PageTransition({ className }: { className?: string }) {
  const { pathname } = useLocation()
  const outlet = useOutlet()
  const k = useMotionScale()
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        className={className}
        initial={{ opacity: 0, y: 14 * k }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 * k }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      >
        {outlet && cloneElement(outlet as ReactElement)}
      </motion.div>
    </AnimatePresence>
  )
}
