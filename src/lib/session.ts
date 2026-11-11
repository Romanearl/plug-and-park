// Simulated charging session (pure). Runs in demo time: ~25 s from start to full,
// whatever the booked duration. Everything is derived from `startedAt`, so a reload
// or tab switch continues exactly where it was.

import type { Booking, Spot } from '../data/types'

export const DEMO_SESSION_MS = 25_000
export const START_BATTERY = 35
export const BATTERY_KWH = 60

export interface SessionState {
  /** 0–1 of the demo session. */
  progress: number
  energyKwh: number
  totalKwh: number
  batteryPct: number
  /** In booked time, e.g. 42 for "42 min left". */
  minutesLeft: number
  done: boolean
}

export function sessionState(
  booking: Pick<Booking, 'startedAt' | 'durationMinutes'>,
  spot: Pick<Spot, 'powerKw'>,
  now: number = Date.now(),
): SessionState {
  const started = booking.startedAt ? new Date(booking.startedAt).getTime() : now
  const progress = Math.max(0, Math.min(1, (now - started) / DEMO_SESSION_MS))
  // A full battery stops taking energy: cap delivery at what fits from START_BATTERY to 100%,
  // so the ring reaches 100% exactly at the end instead of early.
  const fits = ((100 - START_BATTERY) / 100) * BATTERY_KWH
  const totalKwh = Math.round(Math.min(Math.min(spot.powerKw, 60) * (booking.durationMinutes / 60), fits) * 10) / 10
  const energyKwh = Math.round(totalKwh * progress * 10) / 10
  const batteryPct = Math.min(100, Math.round(START_BATTERY + (energyKwh / BATTERY_KWH) * 100))
  const minutesLeft = Math.max(0, Math.ceil((1 - progress) * booking.durationMinutes))
  return { progress, energyKwh, totalKwh, batteryPct, minutesLeft, done: progress >= 1 }
}

/** New spot rating after one more review: weighted average, one decimal. */
export function nextRating(rating: number, count: number, stars: number): { rating: number; reviewsCount: number } {
  const reviewsCount = count + 1
  return { rating: Math.round(((rating * count + stars) / reviewsCount) * 10) / 10, reviewsCount }
}
