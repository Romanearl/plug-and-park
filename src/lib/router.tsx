// Tiny hash router. Hash routing (#/app/spot/3) survives a hard refresh on GitHub Pages.

import { useEffect, useMemo, useSyncExternalStore, type AnchorHTMLAttributes, type ReactNode } from 'react'

function currentPath(): string {
  const raw = window.location.hash.replace(/^#/, '')
  const path = raw.split('?')[0] || '/'
  return path.startsWith('/') ? path : `/${path}`
}

function subscribe(cb: () => void) {
  window.addEventListener('hashchange', cb)
  return () => window.removeEventListener('hashchange', cb)
}

/** Current path without the query string, e.g. "/app/spot/3". */
export function usePath(): string {
  return useSyncExternalStore(subscribe, currentPath)
}

/** Query params from the hash, e.g. #/register?role=owner. */
export function useQuery(): URLSearchParams {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash)
  return new URLSearchParams(hash.split('?')[1] ?? '')
}

/** How the next screen should enter: pushed (slide from right), back (slide from left) or swapped (fade). */
type NavKind = 'forward' | 'back' | 'fade'
let nextKind: NavKind = 'back' // browser back/forward buttons fire hashchange without navigate()

export function navigate(to: string, opts: { replace?: boolean } = {}) {
  nextKind = opts.replace ? 'fade' : 'forward'
  const target = `#${to.startsWith('/') ? to : `/${to}`}`
  if (opts.replace) {
    const url = `${window.location.pathname}${window.location.search}${target}`
    window.history.replaceState(window.history.state, '', url)
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  } else if (window.location.hash !== target) {
    depth++
    window.location.hash = target
  }
}

// Count in-app pushes so `back()` never leaves the app (e.g. after opening a deep link).
let depth = 0

/** Go back in history if we navigated inside the app; otherwise go to `fallback`. */
export function back(fallback = '/') {
  if (depth > 0) {
    depth--
    nextKind = 'back'
    window.history.back()
  } else {
    navigate(fallback, { replace: true })
  }
}

/** Match "/app/spot/:id" against "/app/spot/3" → { id: "3" } (or null). */
export function matchPath(pattern: string, path: string): Record<string, string> | null {
  const p = pattern.split('/').filter(Boolean)
  const s = path.split('/').filter(Boolean)
  if (p.length !== s.length) return null
  const params: Record<string, string> = {}
  for (let i = 0; i < p.length; i++) {
    if (p[i].startsWith(':')) params[p[i].slice(1)] = decodeURIComponent(s[i])
    else if (p[i] !== s[i]) return null
  }
  return params
}

export interface Route {
  path: string
  render: (params: Record<string, string>) => ReactNode
}

export function Router({ routes, fallback }: { routes: Route[]; fallback: (path: string) => ReactNode }) {
  const path = usePath()

  // Each screen scrolls inside its own .scroll container — reset it on route change.
  useEffect(() => {
    document.querySelectorAll<HTMLElement>('.scroll').forEach((el) => el.scrollTo({ top: 0 }))
  }, [path])

  // Pick the transition once per path change, then fall back to "back" for browser buttons.
  const kind = useMemo(() => {
    const k = nextKind
    nextKind = 'back'
    return k
  }, [path])

  let content: ReactNode = null
  for (const r of routes) {
    const params = matchPath(r.path, path)
    if (params) {
      content = r.render(params)
      break
    }
  }
  if (content === null) content = fallback(path)
  // Keyed by path: each screen enters with a short slide/fade. It starts at 50% opacity, never 0,
  // so there is no blank frame between screens.
  return (
    <div key={path} className={`route route-${kind}`}>
      {content}
    </div>
  )
}

export function Link({ to, replace, onClick, ...rest }: { to: string; replace?: boolean } & AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a
      href={`#${to}`}
      onClick={(e) => {
        onClick?.(e)
        if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey) return
        e.preventDefault()
        navigate(to, { replace })
      }}
      {...rest}
    />
  )
}
