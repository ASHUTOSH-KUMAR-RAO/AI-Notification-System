import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/** Scrolls to the `#hash` target (waiting for lazy pages to render it) or back to the top on every route change. */
export function ScrollManager() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (!hash) {
      window.scrollTo(0, 0)
      return
    }
    let tries = 0
    let raf = 0
    const find = () => {
      const el = document.getElementById(decodeURIComponent(hash.slice(1)))
      if (el) el.scrollIntoView()
      else if (tries++ < 40) raf = requestAnimationFrame(find)
    }
    find()
    return () => cancelAnimationFrame(raf)
  }, [pathname, hash])
  return null
}
