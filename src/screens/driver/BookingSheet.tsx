// Booking sheet: day → start time → duration → "Request booking".
// Taken times are NOT hidden: the platform's availability check after "Request booking"
// catches them (flow diagram 1: "Charging spot available?" → No → driver notified).

import { useEffect, useMemo, useRef, useState } from 'react'
import { BottomSheet } from '../../components/BottomSheet'
import { Icon } from '../../components/Icon'
import type { Spot } from '../../data/types'
import { windowsForDay } from '../../lib/availability'
import { checkSlot, DURATIONS, fmtDuration, freeSlotsNear, hhmm, isWithinAvailability, startTimesForDay } from '../../lib/booking'
import { requestBooking } from '../../lib/bookingActions'
import { priceFor } from '../../lib/pricing'
import { navigate } from '../../lib/router'
import { getDB, useCurrentUser } from '../../lib/store'
import { cx, fmtDate, hkd } from '../../lib/util'

const CHECK_MS = 1200

function startOfDay(offset: number) {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + offset)
  return d
}

export function BookingSheet({ spot, open, onClose }: { spot: Spot; open: boolean; onClose: () => void }) {
  const user = useCurrentUser()
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => startOfDay(i)), [])
  const now = new Date()
  const dayEnabled = (d: Date) => windowsForDay(spot, d.getDay()).length > 0
  const hasFutureSlot = (d: Date) => startTimesForDay(spot, d).some((t) => t.getTime() >= now.getTime())

  const firstDay = days.findIndex((d) => dayEnabled(d) && hasFutureSlot(d))
  const [dayIdx, setDayIdx] = useState(Math.max(0, firstDay))
  const [start, setStart] = useState<Date | null>(null)
  const [minutes, setMinutes] = useState(60)
  const [checking, setChecking] = useState(false)
  const [unavailable, setUnavailable] = useState<Date[] | null>(null)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const day = days[dayIdx]
  const times = startTimesForDay(spot, day)
  const fits = (t: Date | null, m: number) => !!t && isWithinAvailability(spot, t, m)

  const pickDay = (i: number) => {
    setDayIdx(i)
    setStart(null)
    setUnavailable(null)
  }
  const pickStart = (t: Date) => {
    setStart(t)
    setUnavailable(null)
    // Keep the duration if it still fits, otherwise the longest one that does.
    if (!fits(t, minutes)) setMinutes([...DURATIONS].reverse().find((m) => fits(t, m)) ?? 15)
  }

  const submit = () => {
    if (!start || !user || checking) return
    setChecking(true)
    setUnavailable(null)
    timer.current = window.setTimeout(() => {
      setChecking(false)
      const db = getDB()
      const result = checkSlot(spot, start, minutes, db.bookings)
      if (result !== 'ok') {
        setUnavailable(freeSlotsNear(spot, start, minutes, db.bookings, 3))
        return
      }
      const r = requestBooking({ spotId: spot.id, driverId: user.id, start, minutes })
      if (!r.ok) {
        setUnavailable(freeSlotsNear(spot, start, minutes, getDB().bookings, 3))
        return
      }
      onClose()
      navigate(`/app/booking/${r.booking.id}`, { replace: true })
    }, CHECK_MS)
  }

  const dayLabel = (d: Date, i: number) => (i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : fmtDate(d).replace(/ \w+$/, ''))
  const total = priceFor(spot, minutes)

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      full
      title="Request booking"
      labelId="booking-title"
      footer={
        <button className="btn btn-primary block" onClick={submit} disabled={!start || checking} aria-busy={checking}>
          {checking ? (
            <>
              <span className="spinner" aria-hidden /> Checking availability…
            </>
          ) : start ? (
            `Request booking · ${hkd(total)}`
          ) : (
            'Choose a start time'
          )}
        </button>
      }
    >
      <div className="row" style={{ justifyContent: 'space-between', gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700 }}>{spot.title}</div>
          <div className="caption">
            {spot.chargerType} · {spot.powerKw} kW
          </div>
        </div>
        <div style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{hkd(spot.pricePerHour)} / hour</div>
      </div>

      <div className="field-label" style={{ marginTop: 20 }}>
        Day
      </div>
      <div className="chip-scroll" role="group" aria-label="Day">
        {days.map((d, i) => (
          <button
            key={i}
            className={cx('chip', i === dayIdx && 'active')}
            aria-pressed={i === dayIdx}
            disabled={!dayEnabled(d)}
            onClick={() => pickDay(i)}
          >
            {dayLabel(d, i)}
          </button>
        ))}
      </div>

      <div className="field-label" style={{ marginTop: 20 }}>
        Start time
      </div>
      {times.length === 0 ? (
        <p className="muted" style={{ marginTop: 8 }}>
          Closed on this day.
        </p>
      ) : (
        <div className="time-grid" role="group" aria-label="Start time">
          {times.map((t) => {
            const past = t.getTime() < now.getTime()
            const sel = start?.getTime() === t.getTime()
            return (
              <button key={t.getTime()} className={cx('time-chip', sel && 'active')} aria-pressed={sel} disabled={past} onClick={() => pickStart(t)}>
                {hhmm(t)}
              </button>
            )
          })}
        </div>
      )}

      <div className="field-label" style={{ marginTop: 20 }}>
        Duration
      </div>
      <div className="row" role="group" aria-label="Duration" style={{ gap: 8, marginTop: 8 }}>
        {DURATIONS.map((m) => (
          <button
            key={m}
            className={cx('chip', m === minutes && 'active')}
            aria-pressed={m === minutes}
            disabled={!!start && !fits(start, m)}
            onClick={() => {
              setMinutes(m)
              setUnavailable(null)
            }}
            style={{ flex: 1, justifyContent: 'center' }}
          >
            {fmtDuration(m)}
          </button>
        ))}
      </div>

      {unavailable && start && (
        <div className="notice amber" role="alert">
          <div className="row" style={{ gap: 8, fontWeight: 700 }}>
            <Icon name="info" size={20} /> This slot is no longer available
          </div>
          <p style={{ marginTop: 4, fontSize: 14 }}>
            {fmtDate(start)} · {hhmm(start)}–{hhmm(new Date(start.getTime() + minutes * 60_000))} is already booked. Try a nearby time:
          </p>
          {unavailable.length > 0 ? (
            <div className="row" style={{ gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              {unavailable.map((t) => (
                <button key={t.getTime()} className="btn btn-secondary sm" onClick={() => pickStart(t)}>
                  {hhmm(t)}
                </button>
              ))}
            </div>
          ) : (
            <p style={{ marginTop: 6, fontSize: 14, fontWeight: 600 }}>No other free times that day — try another day.</p>
          )}
        </div>
      )}

      {start && !unavailable && (
        <div className="summary-card">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 700 }}>
              {fmtDate(start)} · {hhmm(start)}–{hhmm(new Date(start.getTime() + minutes * 60_000))}
            </span>
            <span style={{ fontWeight: 800, fontSize: 18 }}>{hkd(total)}</span>
          </div>
          <div className="caption" style={{ marginTop: 4 }}>
            {fmtDuration(minutes)} · You pay only after the owner approves.
          </div>
        </div>
      )}
      {/* Hidden helper for checks: what the platform would say right now. */}
      <span hidden data-slot-check={start ? checkSlot(spot, start, minutes, getDB().bookings) : ''} />
    </BottomSheet>
  )
}
