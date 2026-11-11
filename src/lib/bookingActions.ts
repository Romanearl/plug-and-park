// Booking actions: validate, then update the DB through updateDB (synced to every window).

import { COMMISSION_RATE } from '../data/seed'
import type { Booking, BookingStatus, Review } from '../data/types'
import { canTransition, checkSlot, hasConflict, type SlotCheck } from './booking'
import { priceFor } from './pricing'
import { nextRating, sessionState } from './session'
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
  const spot = db.spots.find((s) => s.id === input.spotId && s.active && s.reviewStatus === 'approved')
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

// ── S5: pay → start → complete → review ─────────────────────────────────────

/** After the gateway said yes. Stores ONLY the last 4 digits of the card. */
export function payBooking(bookingId: string, driverId: string, last4: string): ActionResult {
  const db = getDB()
  const b = db.bookings.find((x) => x.id === bookingId)
  if (!b || b.driverId !== driverId) return { ok: false, reason: 'Booking not found' }
  if (b.status !== 'confirmed') return { ok: false, reason: 'Only approved bookings can be paid' }
  const spot = db.spots.find((s) => s.id === b.spotId)
  const pin = spot?.accessPin ?? '0000'
  return setStatus(bookingId, 'paid', {
    paymentLast4: last4.replace(/\D/g, '').slice(-4),
    pin,
    qrPayload: `PLUGPARK|${b.id}|${pin}`,
    paidAt: new Date().toISOString(),
  })
}

/** "I've arrived — start charging". Can't be started twice. */
export function startSession(bookingId: string, driverId: string): ActionResult {
  const b = getDB().bookings.find((x) => x.id === bookingId)
  if (!b || b.driverId !== driverId) return { ok: false, reason: 'Booking not found' }
  if (b.status !== 'paid') return { ok: false, reason: b.status === 'active' ? 'This session has already started' : 'Pay before you start charging' }
  return setStatus(bookingId, 'active', { startedAt: new Date().toISOString() })
}

/** Ends the session (at the end of the demo time, on Stop, or via "Skip charging to the end"). */
export function completeSession(bookingId: string, opts: { skipToEnd?: boolean } = {}): ActionResult {
  const db = getDB()
  const b = db.bookings.find((x) => x.id === bookingId)
  if (!b) return { ok: false, reason: 'Booking not found' }
  if (b.status !== 'active') return { ok: false, reason: 'No active session' }
  const spot = db.spots.find((s) => s.id === b.spotId)
  const st = spot ? sessionState(b, spot) : null
  const energyKwh = opts.skipToEnd ? (st?.totalKwh ?? 0) : (st?.energyKwh ?? 0)
  return setStatus(bookingId, 'completed', { energyKwh, completedAt: new Date().toISOString() })
}

export const REVIEW_TAGS = ['Easy to find', 'Fast charging', 'Clean bay', 'Helpful owner', 'Good value'] as const

export function submitReview(input: { bookingId: string; driverId: string; rating: number; tags: string[]; text: string }): { ok: true; review: Review } | { ok: false; reason: string } {
  const db = getDB()
  const b = db.bookings.find((x) => x.id === input.bookingId)
  if (!b || b.driverId !== input.driverId) return { ok: false, reason: 'Booking not found' }
  if (b.status !== 'completed') return { ok: false, reason: 'You can rate after your session' }
  if (b.reviewed) return { ok: false, reason: 'Already reviewed' }
  if (input.rating < 1 || input.rating > 5) return { ok: false, reason: 'Choose a star rating' }
  const review: Review = {
    id: id('rv'),
    bookingId: b.id,
    spotId: b.spotId,
    driverId: b.driverId,
    rating: input.rating,
    text: input.text.trim().slice(0, 300),
    tags: input.tags,
    createdAt: new Date().toISOString(),
  }
  updateDB((d) => ({
    ...d,
    reviews: [review, ...d.reviews],
    bookings: d.bookings.map((x) => (x.id === b.id ? { ...x, reviewed: true, updatedAt: review.createdAt } : x)),
    spots: d.spots.map((sp) => (sp.id === b.spotId ? { ...sp, ...nextRating(sp.rating, sp.reviewsCount, input.rating) } : sp)),
  }))
  return { ok: true, review }
}
