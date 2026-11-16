// Auto-approve: requests to spots of the other (non-demo) owners are approved
// AUTO_APPROVE_MS after they were created, so a driver is never stuck on "Waiting…".
// The demo owner's requests (Wong Mei Ling) stay manual for the scripted demo.

import { AUTO_APPROVE_MS, DEMO_ACCOUNTS } from '../data/seed'
import type { Booking } from '../data/types'

type Candidate = Pick<Booking, 'id' | 'status' | 'ownerId' | 'createdAt'>

/** Pure: the pending bookings whose auto-approval time has come at `now` (ms). */
export function dueAutoApprovals<T extends Candidate>(bookings: T[], now: number): T[] {
  return bookings.filter((b) => b.status === 'pending' && b.ownerId !== DEMO_ACCOUNTS.owner.userId && autoApproveAt(b) <= now)
}

/** When this booking will be auto-approved (ms), or Infinity if it never will be. */
export function autoApproveAt(b: Candidate): number {
  if (b.status !== 'pending' || b.ownerId === DEMO_ACCOUNTS.owner.userId) return Infinity
  const t = new Date(b.createdAt).getTime()
  return Number.isFinite(t) ? t + AUTO_APPROVE_MS : 0
}
