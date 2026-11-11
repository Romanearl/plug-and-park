// Weekly availability windows → "is it open?", "when does it open?", and readable summaries.
// Pure functions: no React, no store.

import type { AvailabilityWindow, Spot } from '../data/types'

const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
/** Display order: Monday first. */
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

export function windowsForDay(spot: Pick<Spot, 'availability'>, day: number): AvailabilityWindow[] {
  return spot.availability.filter((w) => w.day === day).sort((a, b) => toMinutes(a.start) - toMinutes(b.start))
}

export function isOpenAt(spot: Pick<Spot, 'availability'>, date: Date): boolean {
  const mins = date.getHours() * 60 + date.getMinutes()
  return windowsForDay(spot, date.getDay()).some((w) => mins >= toMinutes(w.start) && mins < toMinutes(w.end))
}

/** The next moment (≥ from) a window starts, within the coming week. Null if the spot has no windows. */
export function nextOpening(spot: Pick<Spot, 'availability'>, from: Date): Date | null {
  for (let offset = 0; offset <= 7; offset++) {
    const day = new Date(from)
    day.setDate(from.getDate() + offset)
    for (const w of windowsForDay(spot, day.getDay())) {
      const start = new Date(day)
      const m = toMinutes(w.start)
      start.setHours(Math.floor(m / 60), m % 60, 0, 0)
      if (start.getTime() >= from.getTime()) return start
    }
  }
  return null
}

export interface OpenStatus {
  open: boolean
  /** "Open now", "Opens 08:30", "Opens Sat 08:00" or "Closed". */
  label: string
}

export function openStatus(spot: Pick<Spot, 'availability'>, now: Date): OpenStatus {
  if (isOpenAt(spot, now)) return { open: true, label: 'Open now' }
  const next = nextOpening(spot, now)
  if (!next) return { open: false, label: 'Closed' }
  const hhmm = `${String(next.getHours()).padStart(2, '0')}:${String(next.getMinutes()).padStart(2, '0')}`
  const sameDay = next.toDateString() === now.toDateString()
  return { open: false, label: sameDay ? `Opens ${hhmm}` : `Opens ${DAY_SHORT[next.getDay()]} ${hhmm}` }
}

export interface AvailabilityLine {
  /** e.g. "Mon–Fri 08:30–19:00" */
  label: string
  days: number[]
}

/** Labels a set of days: "Every day", "Mon–Fri", "Sat–Sun", "Mon, Wed, Fri". */
function dayRangeLabel(days: number[]): string {
  if (days.length === 7) return 'Every day'
  const idx = days.map((d) => WEEK_ORDER.indexOf(d)).sort((a, b) => a - b)
  const runs: number[][] = []
  for (const i of idx) {
    const last = runs[runs.length - 1]
    if (last && i === last[last.length - 1] + 1) last.push(i)
    else runs.push([i])
  }
  return runs
    .map((r) => {
      const a = DAY_SHORT[WEEK_ORDER[r[0]]]
      const b = DAY_SHORT[WEEK_ORDER[r[r.length - 1]]]
      return r.length === 1 ? a : r.length === 2 ? `${a}, ${b}` : `${a}–${b}`
    })
    .join(', ')
    .replace(/^Sat, Sun$/, 'Sat–Sun')
}

/** Groups days that have identical hours: ["Mon–Fri 08:30–19:00", "Sat–Sun 09:00–18:00"]. */
export function formatAvailability(spot: Pick<Spot, 'availability'>): AvailabilityLine[] {
  const byHours = new Map<string, number[]>()
  for (const day of WEEK_ORDER) {
    const ws = windowsForDay(spot, day)
    if (ws.length === 0) continue
    const key = ws.map((w) => `${w.start}–${w.end}`).join(', ')
    byHours.set(key, [...(byHours.get(key) ?? []), day])
  }
  return [...byHours.entries()]
    .map(([hours, days]) => ({ label: `${dayRangeLabel(days)} ${hours}`, days }))
    .sort((a, b) => WEEK_ORDER.indexOf(a.days[0]) - WEEK_ORDER.indexOf(b.days[0]))
}
