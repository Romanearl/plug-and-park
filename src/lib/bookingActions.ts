// Booking actions: validate, then update the DB through updateDB (synced to every window).

import { COMMISSION_RATE } from '../data/seed'
import type { Booking, BookingStatus } from '../data/types'
import { canTransition, checkSlot, hasConflict, type SlotCheck } from './booking'
import { priceFor } from './pricing'
import { getDB, updateDB } from './store'
import { id } from './util'

export type ActionResult = { ok: true; booking: Booking } | { ok: false; reason: string }

function setStatus(bookingId: string, to: BookingStatus, patch: Partial<Booking> = {}): ActionResult {
  const b = getDB().bookings.find((x) => x.id === bookingId)
  if (!b) return { ok: false, reason: 'Booking not found' }
  if (!canTransition(b.status, to)) return { ok: false, reason: `Can't change a ${b.status} booking to ${to}` }
  const updated: Booking = { ...b, ...patch, status: to, updatedAt: new Date().toISOString() }
  updateDB((db) => ({ ...db, bookings: db.bookings.map((x) => (x.id === bookingId ? updated : x)) }))
  return { ok: true, booking: updated }
}

export function requestBooking(input: {
  spotId: string
  driverId: string
  start: Date
  minutes: number
}): ActionResult | { ok: false; reason: SlotCheck } {
  const db = getDB()
  const spot = db.spots.find((s) => s.id === input.spotId && s.active)
  if (!spot) return { ok: false, reason: 'Charger not found' }
  const check = checkSlot(spot, input.start, input.minutes, db.bookings)
  if (check !== 'ok') return { ok: false, reason: check }
  const now = new Date().toISOString()
  const booking: Booking = {
    id: id('bk'),
    spotId: spot.id,
    driverId: input.driverId,
    ownerId: spot.ownerId,
    start: input.start.toISOString(),
    durationMinutes: input.minutes,
    price: priceFor(spot, input.minutes),
    commissionRate: COMMISSION_RATE,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  }
  updateDB((d) => ({ ...d, bookings: [...d.bookings, booking] }))
  return { ok: true, booking }
}

/** Driver cancels — only while the request is still pending. */
export function cancelRequest(bookingId: string, driverId: string): ActionResult {
  const b = getDB().bookings.find((x) => x.id === bookingId)
  if (!b || b.driverId !== driverId) return { ok: false, reason: 'Booking not found' }
  if (b.status !== 'pending') return { ok: false, reason: 'Only pending requests can be cancelled' }
  return setStatus(bookingId, 'cancelled')
}

export const SLOT_TAKEN_REASON = 'Slot no longer available'

/** Owner approves. Re-checks the slot: if it was taken meanwhile, the request is declined instead. */
export function approveBooking(bookingId: string): ActionResult {
  const db = getDB()
  const b = db.bookings.find((x) => x.id === bookingId)
  if (!b) return { ok: false, reason: 'Booking not found' }
  if (b.status !== 'pending') return { ok: false, reason: `Can't approve a ${b.status} booking` }
  if (hasConflict(b.spotId, new Date(b.start), b.durationMinutes, db.bookings, b.id)) {
    setStatus(bookingId, 'declined', { declineReason: SLOT_TAKEN_REASON })
    return { ok: false, reason: SLOT_TAKEN_REASON }
  }
  return setStatus(bookingId, 'confirmed')
}

export const DECLINE_REASONS = ['I need the bay myself', 'Charger under maintenance', 'Other'] as const

export function declineBooking(bookingId: string, reason: string): ActionResult {
  const b = getDB().bookings.find((x) => x.id === bookingId)
  if (!b) return { ok: false, reason: 'Booking not found' }
  if (b.status !== 'pending') return { ok: false, reason: `Can't decline a ${b.status} booking` }
  return setStatus(bookingId, 'declined', { declineReason: reason })
}
