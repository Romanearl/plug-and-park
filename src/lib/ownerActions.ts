// Owner actions: payouts and spot management. Validate, then updateDB (synced to every window).

import type { AvailabilityWindow, Payout, Spot } from '../data/types'
import { ownerBalance, validatePin, validateRange } from './money'
import { getDB, updateDB } from './store'
import { id } from './util'

type Result<T> = { ok: true; value: T } | { ok: false; reason: string }

/** Withdraw the whole available balance. `destination` must already be masked. */
export function requestPayout(ownerId: string, method: Payout['method'], destination: string): Result<Payout> {
  const db = getDB()
  const { available } = ownerBalance(ownerId, db)
  if (available <= 0) return { ok: false, reason: 'Nothing to withdraw yet' }
  if (/\d{5,}/.test(destination)) return { ok: false, reason: 'Destination must be masked' }
  const payout: Payout = { id: id('po'), ownerId, amount: available, method, destination, status: 'processing', createdAt: new Date().toISOString() }
  updateDB((d) => ({
    ...d,
    payouts: [payout, ...d.payouts],
    users: d.users.map((u) => (u.id === ownerId ? { ...u, payoutMethod: { type: method, label: destination } } : u)),
  }))
  return { ok: true, value: payout }
}

function updateSpot(spotId: string, ownerId: string, patch: Partial<Spot>): Result<Spot> {
  const spot = getDB().spots.find((s) => s.id === spotId)
  if (!spot || spot.ownerId !== ownerId) return { ok: false, reason: 'Spot not found' }
  const next = { ...spot, ...patch }
  updateDB((d) => ({ ...d, spots: d.spots.map((s) => (s.id === spotId ? next : s)) }))
  return { ok: true, value: next }
}

export const setSpotActive = (spotId: string, ownerId: string, active: boolean) => updateSpot(spotId, ownerId, { active })

export function setSpotPrice(spotId: string, ownerId: string, pricePerHour: number): Result<Spot> {
  if (!Number.isInteger(pricePerHour) || pricePerHour < 20 || pricePerHour > 35) return { ok: false, reason: 'Price must be HK$20–35' }
  return updateSpot(spotId, ownerId, { pricePerHour })
}

/** One window per day: `days[d]` is null (closed) or { start, end }. Existing bookings are untouched. */
export function setSpotAvailability(spotId: string, ownerId: string, days: ({ start: string; end: string } | null)[]): Result<Spot> {
  const availability: AvailabilityWindow[] = []
  for (let day = 0; day < 7; day++) {
    const w = days[day]
    if (!w) continue
    const err = validateRange(w.start, w.end)
    if (err) return { ok: false, reason: err }
    availability.push({ day, start: w.start, end: w.end })
  }
  return updateSpot(spotId, ownerId, { availability })
}

export function setSpotAccess(spotId: string, ownerId: string, accessPin: string, instructions: string): Result<Spot> {
  const err = validatePin(accessPin)
  if (err) return { ok: false, reason: err }
  if (instructions.trim().length > 200) return { ok: false, reason: 'Keep instructions under 200 characters' }
  return updateSpot(spotId, ownerId, { accessPin, instructions: instructions.trim() })
}
