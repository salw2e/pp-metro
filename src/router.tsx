import { useEffect, useState, type AnchorHTMLAttributes, type MouseEvent } from 'react'

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '')

export const PAGES = ['summary', 'map', 'lines', 'stations', 'engineering', 'finance', 'roadmap', 'environment', 'references', 'submission'] as const
export type Page = (typeof PAGES)[number] | 'print-report' | 'print-map' | 'not-found'

function parse(): { page: Page; query: URLSearchParams; hash: string } {
  const path = location.pathname.startsWith(BASE) ? location.pathname.slice(BASE.length) : location.pathname
  const seg = path.replace(/^\/+|\/+$/g, '')
  const page = (seg === '' ? 'summary' : seg) as Page
  const known = [...PAGES, 'print-report', 'print-map'] as string[]
  return { page: known.includes(page) ? page : 'not-found', query: new URLSearchParams(location.search), hash: location.hash.slice(1) }
}

export const href = (page: Page, query?: Record<string, string>) => {
  const q = query ? `?${new URLSearchParams(query)}` : ''
  return `${BASE}/${page === 'summary' ? '' : page}${q}`
}

export function navigate(to: string, replace = false) {
  if (replace) history.replaceState(null, '', to)
  else history.pushState(null, '', to)
  dispatchEvent(new PopStateEvent('popstate'))
}

export function useRoute() {
  const [route, setRoute] = useState(parse)
  useEffect(() => {
    const on = () => setRoute(parse())
    addEventListener('popstate', on)
    return () => removeEventListener('popstate', on)
  }, [])
  return route
}

export function Link({ to, onClick, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { to: string }) {
  const click = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e)
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    e.preventDefault()
    navigate(to)
    scrollTo(0, 0)
  }
  return <a href={to} onClick={click} {...rest} />
}
