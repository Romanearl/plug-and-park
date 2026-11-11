// Simulated auth. Passwords are scrambled with fakeHash (NOT real security), the OTP is
// always the demo code, and a pending login/registration is kept per window until verified.

import type { Role, User } from '../data/types'
import { DEMO_OTP } from '../data/seed'
import { getDB, signIn, updateDB } from './store'
import { fakeHash, id } from './util'
import { normalizeEmail } from './validation'

export type Pending =
  | { kind: 'login'; userId: string }
  | {
      kind: 'register'
      user: { role: Role; name: string; email: string; phone: string; passwordHash: string }
    }

const pendingKey = () => `pp.pending.${window.name || 'main'}`
let memoryPending: Pending | null = null // fallback when sessionStorage is blocked

export function setPending(p: Pending | null) {
  memoryPending = p
  try {
    if (p) sessionStorage.setItem(pendingKey(), JSON.stringify(p))
    else sessionStorage.removeItem(pendingKey())
  } catch {
    /* in-memory only */
  }
}

export function getPending(): Pending | null {
  try {
    const raw = sessionStorage.getItem(pendingKey())
    if (raw) return JSON.parse(raw) as Pending
  } catch {
    /* fall back to memory */
  }
  return memoryPending
}

/** Returns the user for a correct email + password, or null (never says which one was wrong). */
export function checkLogin(email: string, password: string): User | null {
  const e = normalizeEmail(email)
  const user = getDB().users.find((u) => u.email === e)
  return user && user.passwordHash === fakeHash(password) ? user : null
}

/** Phone of whoever is about to verify (for the masked "Sent to …" line). */
export function pendingPhone(p: Pending): string | undefined {
  if (p.kind === 'register') return p.user.phone
  return getDB().users.find((u) => u.id === p.userId)?.phone
}

export function pendingRole(p: Pending): Role {
  if (p.kind === 'register') return p.user.role
  return getDB().users.find((u) => u.id === p.userId)?.role ?? 'driver'
}

export const isCorrectOtp = (code: string) => code === DEMO_OTP

/** Completes verification: creates the user when registering, signs in, clears pending. */
export function completeVerification(p: Pending): User {
  let user: User | undefined
  if (p.kind === 'register') {
    // If the same email was registered meanwhile (e.g. another window), reuse it.
    user = getDB().users.find((u) => u.email === p.user.email)
    if (!user) {
      const created: User = {
        id: id('u'),
        ...p.user,
        verified: true,
        rating: 5,
        ratingCount: 0,
        createdAt: new Date().toISOString(),
      }
      updateDB((db) => ({ ...db, users: [...db.users, created] }))
      user = created
    }
  } else {
    user = getDB().users.find((u) => u.id === p.userId)
  }
  if (!user) throw new Error('Account not found')
  signIn(user.id)
  setPending(null)
  return user
}
