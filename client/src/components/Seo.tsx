import { useEffect } from 'react'

const SITE = 'Notify'

function setMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.content = content
}

/** Sets the document title and description / Open Graph tags for the current page. */
export function Seo({ title, description }: { title?: string; description?: string }) {
  useEffect(() => {
    const full = title ? `${title} · ${SITE}` : `${SITE} · AI-powered real-time notifications`
    document.title = full
    setMeta('property', 'og:title', full)
    setMeta('name', 'twitter:title', full)
    if (description) {
      setMeta('name', 'description', description)
      setMeta('property', 'og:description', description)
      setMeta('name', 'twitter:description', description)
    }
    setMeta('property', 'og:url', window.location.href)
  }, [title, description])
  return null
}
