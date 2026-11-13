// Owner money rules (pure). Diagram 2: escrow → finalise bill minus commission + gateway fee
// → net payout. Every money figure on the owner screens comes from here.

import type { Booking, DB, Payout } from '../data/types'

export const COMMISSION_RATE = 0.18
export const GATEWAY_FEE_RATE = 0.03
/** Mock bank/FPS: a payout is "paid" this long after it was created. */
export const PAYOUT_SETTLE_MS = 8_000

const cents = (n: number) => Math.round(n * 100) / 100

export interface Breakdown {
  gross: number
  commission: number
  gatewayFee: number
  net: number
}

/** HK$30 → 5.40 + 0.90 → net 23.70. */
export function breakdown(price: number, commissionRate: number = COMMISSION_RATE): Breakdown {
  const gross = cents(price)
  const commission = cents(gross * commissionRate)
  const gatewayFee = cents(gross * GATEWAY_FEE_RATE)
  return { gross, commission, gatewayFee, net: cents(gross - commission - gatewayFee) }
}

export const netOf = (b: Pick<Booking, 'price' | 'commissionRate'>) => breakdown(b.price, b.commissionRate).net

export interface OwnerBalance {
  /** Net of paid / active bookings — the platform is holding the money. */
  inEscrow: number
  /** Net of completed bookings minus all payouts. */
  available: number
  paidOut: number
  lifetimeNet: number
}

export function ownerBalance(ownerId: string, db: Pick<DB, 'bookings' | 'payouts'>): OwnerBalance {
  const mine = db.bookings.filter((b) => b.ownerId === ownerId)
  const sum = (xs: number[]) => cents(xs.reduce((a, b) => a + b, 0))
  const inEscrow = sum(mine.filter((b) => b.status === 'paid' || b.status === 'active').map(netOf))
  const lifetimeNet = sum(mine.filter((b) => b.status === 'completed').map(netOf))
  const paidOut = sum(db.payouts.filter((p) => p.ownerId === ownerId).map((p) => p.amount))
  return { inEscrow, available: cents(Math.max(0, lifetimeNet - paidOut)), paidOut, lifetimeNet }
}

/** Processing → paid ~8 s after creation, derived from createdAt (survives reloads). */
export function payoutStatus(p: Pick<Payout, 'createdAt' | 'status'>, now: number = Date.now()): Payout['status'] {
  return p.status === 'paid' || now - new Date(p.createdAt).getTime() >= PAYOUT_SETTLE_MS ? 'paid' : 'processing'
}

/** "HK$5.40" style (always two decimals, for breakdowns). */
export const hk2 = (n: number) => `HK$${n.toFixed(2)}`

// ── Validation for the withdraw sheet / access section ──

/** FPS ID: an 8-digit HK mobile (4–9 first) or an email. */
export function validateFpsId(v: string): string | null {
  const s = v.trim()
  // "+852 9123 4567" and "852 9123 4567" carry the area code; a plain 8-digit number that happens to start with 852 doesn't.
  const digits = s.replace(/[\s-]/g, '').replace(/^(\+852|852(?=\d{8}$))/, '')
  if (/^[4-9]\d{7}$/.test(digits)) return null
  if (/^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[a-z]{2,}$/i.test(s)) return null
  return 'Enter an 8-digit HK mobile number or an email'
}

export function validateAccountNumber(v: string): string | null {
  return /^\d{9,12}$/.test(v.replace(/[\s-]/g, '')) ? null : 'Enter a 9–12 digit account number'
}

export const validatePin = (v: string) => (/^\d{4}$/.test(v) ? null : 'The PIN must be exactly 4 digits')

/** "End time must be after start time" when to ≤ from ("HH:MM" strings). */
export const validateRange = (from: string, to: string) => (to > from ? null : 'End time must be after start time')
