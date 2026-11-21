import { useReducedMotion } from 'framer-motion'

/**
 * Motion is always on. With prefers-reduced-motion the app only lowers intensity:
 * shorter travel distances (this scale), slower loops (CSS --marquee-slow), no tilt/parallax.
 */
export function useMotionScale() {
  return useReducedMotion() ? 0.4 : 1
}
