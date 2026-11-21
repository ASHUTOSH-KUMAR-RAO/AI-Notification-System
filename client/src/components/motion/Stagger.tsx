import { motion, type HTMLMotionProps, type Variants } from 'framer-motion'
import { useMotionScale } from '@/lib/motion'

const GROUP: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } }
const item = (k: number): Variants => ({ hidden: { opacity: 0, y: 18 * k }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } } })

/** Parent that staggers every descendant `Stagger` (variants propagate through plain elements). Gentler under reduced motion. */
export function StaggerGroup(props: HTMLMotionProps<'div'>) {
  return <motion.div variants={GROUP} initial="hidden" animate="show" {...props} />
}

/** Item that fades/rises in as part of the nearest `StaggerGroup`. */
export function Stagger(props: HTMLMotionProps<'div'>) {
  const k = useMotionScale()
  return <motion.div variants={item(k)} {...props} />
}
