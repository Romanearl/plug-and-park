// Tiny persistent store — the app's fake "backend".
//
// • The whole database (users, spots, bookings…) lives in localStorage under DB_KEY.
// • Every tab/window of the app shares it, and the `storage` event keeps them in
//   sync live — so a driver window and an owner window update each other instantly.
// • The logged-in user is per window (sessionStorage keyed by window.name), so two
//   phone frames on one screen can be logged in as different people.

import { useSyncExternalStore } from 'react'
import type { DB, User } from '../data/types'
import { createSeed, DB_VERSION } from '../data/seed'
import { navigate } from './router'

const DB_KEY = 'pp.db'
const sessionKey = () => `pp.session.${window.name || 'main'}`

type Listener = () => void
const listeners = new Set<Listener>()
const emit = () => listeners.forEach((l) => l())

function storageOf(kind: 'local' | 'session'): Storage | null {
  try {
    return kind === 'local' ? window.localStorage : window.sessionStorage
  } catch {
    return null // access itself can throw when storage is blocked
  }
}

function safeGet(kind: 'local' | 'session', key: string): string | null {
  try {
    return storageOf(kind)?.getItem(key) ?? null
  } catch {
    return null
  }
}
function safeSet(kind: 'local' | 'session', key: string, value: string | null) {
  try {
    const s = storageOf(kind)
    if (!s) return
    if (value === null) s.removeItem(key)
    else s.setItem(key, value)
  } catch {
    /* private mode / blocked storage — the demo still works in memory */
  }
}

function parseDB(raw: string | null): DB | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as DB
    return parsed && parsed.version === DB_VERSION ? parsed : null
  } catch {
    return null
  }
}

function loadDB(): DB {
  const existing = parseDB(safeGet('local', DB_KEY))
  if (existing) return existing
  const fresh = createSeed()
  safeSet('local', DB_KEY, JSON.stringify(fresh))
  return fresh
}

let db: DB = loadDB()
let sessionUserId: string | null = safeGet('session', sessionKey())

// Live sync between windows/tabs.
window.addEventListener('storage', (e) => {
  if (e.key === DB_KEY || e.key === null) {
    db = parseDB(e.newValue) ?? loadDB()
    emit()
  }
})

function subscribe(l: Listener) {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}

/** Read the database. Re-renders whenever anything changes (here or in another window). */
export function useDB(): DB {
  return useSyncExternalStore(subscribe, () => db)
}

export function getDB(): DB {
  return db
}

/** Apply an immutable update to the database and persist it. */
export function updateDB(fn: (draft: DB) => DB) {
  db = fn(db)
  safeSet('local', DB_KEY, JSON.stringify(db))
  emit()
}

// ── Session ────────────────────────────────────────────────────────────────

export function useCurrentUser(): User | null {
  const data = useDB()
  const uid = useSyncExternalStore(subscribe, () => sessionUserId)
  return uid ? (data.users.find((u) => u.id === uid) ?? null) : null
}

export function signIn(userId: string) {
  sessionUserId = userId
  safeSet('session', sessionKey(), userId)
  emit()
}

export function signOut() {
  sessionUserId = null
  safeSet('session', sessionKey(), null)
  emit()
}

/** Re-seed the data only (keeps sessions and the route). Used by the presenter view. */
export function reseedDemo() {
  db = createSeed()
  safeSet('local', DB_KEY, JSON.stringify(db))
  emit()
}

/** Wipe everything back to the seed data, sign out and go to the landing page. */
export function resetDemo() {
  // Navigate first (synchronously), so route guards don't bounce the signed-out window to #/login.
  navigate('/', { replace: true })
  db = createSeed()
  safeSet('local', DB_KEY, JSON.stringify(db))
  signOut()
}
