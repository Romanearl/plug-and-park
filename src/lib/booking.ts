// Booking rules (pure — no store, no React). DB actions live in bookingActions.ts.

import type { Booking, BookingStatus, Spot } from '../data/types'
import { windowsForDay } from './availability'

export const DURATIONS = [15, 30, 60, 120] as const
/** Statuses that hold the bay. A pending request doesn't block anyone. */
export const BLOCKING: BookingStatus[] = ['confirmed', 'paid', 'active']

const toMin = (hhmm: string) => +hhmm.slice(0, 2) * 60 + +hhmm.slice(3, 5)
const minOfDay = (d: Date) => d.getHours() * 60 + d.getMinutes()
const addMin = (d: Date, m: number) => new Date(d.getTime() + m * 60_000)

/** The whole slot lies inside one availability window of that weekday. */
export function isWithinAvailability(spot: Pick<Spot, 'availability'>, start: Date, minutes: number): boolean {
  const s = minOfDay(start)
  const e = s + minutes
  return windowsForDay(spot, start.getDay()).some((w) => s >= toMin(w.start) && e <= toMin(w.end))
}

/** Overlaps a confirmed / paid / active booking of the same spot. */
export function hasConflict(
  spotId: string,
  start: Date,
  minutes: number,
  bookings: Pick<Booking, 'id' | 'spotId' | 'start' | 'durationMinutes' | 'status'>[],
  ignoreId?: string,
): boolean {
  const s = start.getTime()
  const e = s + minutes * 60_000
  return bookings.some((b) => {
    if (b.spotId !== spotId || b.id === ignoreId || !BLOCKING.includes(b.status)) return false
    const bs = new Date(b.start).getTime()
    const be = bs + b.durationMinutes * 60_000
    return s < be && bs < e
  })
}

export type SlotCheck = 'ok' | 'closed' | 'taken' | 'past'

export function checkSlot(
  spot: Pick<Spot, 'id' | 'availability'>,
  start: Date,
  minutes: number,
  bookings: Pick<Booking, 'id' | 'spotId' | 'start' | 'durationMinutes' | 'status'>[],
  now: Date = new Date(),
): SlotCheck {
  if (start.getTime() < now.getTime()) return 'past'
  if (!isWithinAvailability(spot, start, minutes)) return 'closed'
  if (hasConflict(spot.id, start, minutes, bookings)) return 'taken'
  return 'ok'
}

/** Every 30-minute start time inside the day's windows (as Dates on `day`). */
export function startTimesForDay(spot: Pick<Spot, 'availability'>, day: Date, minDuration = 15): Date[] {
  const out: Date[] = []
  for (const w of windowsForDay(spot, day.getDay())) {
    for (let m = toMin(w.start); m + minDuration <= toMin(w.end); m += 30) {
      const d = new Date(day)
      d.setHours(Math.floor(m / 60), m % 60, 0, 0)
      out.push(d)
    }
  }
  return out
}

/**
 * Up to `n` free start times that day around `start` (30-minute steps), in time order:
 * the nearest earlier one and the nearest later ones (n = 3 → 1 earlier + 2 later).
 * If one side runs short, the other side fills the gap.
 */
export function freeSlotsNear(
  spot: Pick<Spot, 'id' | 'availability'>,
  start: Date,
  minutes: number,
  bookings: Pick<Booking, 'id' | 'spotId' | 'start' | 'durationMinutes' | 'status'>[],
  n = 3,
  now: Date = new Date(),
): Date[] {
  const free = startTimesForDay(spot, start, minutes).filter((t) => t.getTime() !== start.getTime() && checkSlot(spot, t, minutes, bookings, now) === 'ok')
  const earlier = free.filter((t) => t.getTime() < start.getTime()).reverse() // nearest first
  const later = free.filter((t) => t.getTime() > start.getTime())
  const wantEarlier = Math.min(earlier.length, n > 1 ? 1 : 0)
  const picked = [...earlier.slice(0, wantEarlier), ...later.slice(0, n - wantEarlier)]
  // Later side ran short → take more earlier ones.
  if (picked.length < n) picked.push(...earlier.slice(wantEarlier, wantEarlier + n - picked.length))
  return picked.sort((a, b) => a.getTime() - b.getTime())
}

export const endOf = (b: Pick<Booking, 'start' | 'durationMinutes'>) => addMin(new Date(b.start), b.durationMinutes)

/** "13:00" */
export const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`

/** "15 min", "30 min", "1 h", "2 h" */
export const fmtDuration = (m: number) => (m < 60 ? `${m} min` : `${m / 60} h`)

/** Which status changes are allowed. */
export const TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  pending: ['confirmed', 'declined', 'cancelled'],
  confirmed: ['paid', 'cancelled'],
  declined: [],
  paid: ['active', 'cancelled'],
  active: ['completed'],
  completed: [],
  cancelled: [],
}
export const canTransition = (from: BookingStatus, to: BookingStatus) => TRANSITIONS[from].includes(to)
