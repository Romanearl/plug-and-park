// Map style: the light greyed map is the default; "Dark" can be switched on in the demo sheet.
// The choice lives in localStorage and syncs across windows (both phones in the presenter view switch together).
// It only sets <html data-map-style>, which swaps the --map-filter token and the map background in app.css.

import { useSyncExternalStore } from 'react'

export type MapStyle = 'dark' | 'light'
const KEY = 'pp.mapStyle'
const listeners = new Set<() => void>()
let current: MapStyle = read()

function read(): MapStyle {
  try {
    return localStorage.getItem(KEY) === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light' // storage blocked: the demo still works in memory
  }
}

function apply() {
  document.documentElement.dataset.mapStyle = current
  listeners.forEach((l) => l())
}

export function setMapStyle(style: MapStyle) {
  current = style
  try {
    localStorage.setItem(KEY, style)
  } catch {
    /* in-memory only */
  }
  apply()
}

export const getMapStyle = () => current

export function useMapStyle(): MapStyle {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => current,
  )
}

window.addEventListener('storage', (e) => {
  if (e.key !== null && e.key !== KEY) return
  current = read()
  apply()
})
apply()
