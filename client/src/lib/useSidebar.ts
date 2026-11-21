import { useCallback, useState } from 'react'

const KEY = 'notify:sidebar-collapsed'

/** Collapsed state of the desktop sidebar, remembered in localStorage (storage can throw, so every access is guarded). */
export function useSidebarCollapsed() {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(KEY) === '1'
    } catch {
      return false
    }
  })
  const toggle = useCallback(() => {
    setCollapsed((c) => {
      try {
        localStorage.setItem(KEY, c ? '0' : '1')
      } catch {
        /* storage unavailable: keep in-memory state only */
      }
      return !c
    })
  }, [])
  return [collapsed, toggle] as const
}
