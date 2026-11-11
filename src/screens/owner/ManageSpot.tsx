// Owner → Manage spot: price, weekly availability scheduler (proposal's core owner feature),
// and access details (diagram 3: "Update access codes, photos, etc. when needed").

import { useEffect, useState } from 'react'
import { TextField } from '../../components/Field'
import { Icon } from '../../components/Icon'
import { SpotPhoto } from '../../components/SpotPhoto'
import type { Spot } from '../../data/types'
import { formatAvailability, windowsForDay } from '../../lib/availability'
import { breakdown, hk2, validatePin, validateRange } from '../../lib/money'
import { setSpotAccess, setSpotAvailability, setSpotPrice } from '../../lib/ownerActions'
import { navigate } from '../../lib/router'
import { useCurrentUser, useDB } from '../../lib/store'
import { cx, hkd } from '../../lib/util'

const WEEK = [1, 2, 3, 4, 5, 6, 0] // Monday first
const DAY_NAME = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const TIMES = Array.from({ length: 49 }, (_, i) => `${String(Math.floor(i / 2)).padStart(2, '0')}:${i % 2 ? '30' : '00'}`).map((t) => (t === '24:00' ? '23:59' : t))

type DayRow = { on: boolean; start: string; end: string }
const rowsFrom = (spot: Spot): DayRow[] =>
  Array.from({ length: 7 }, (_, day) => {
    const w = windowsForDay(spot, day)[0]
    return w ? { on: true, start: w.start, end: w.end } : { on: false, start: '08:30', end: '19:00' }
  })

export function ManageSpot({ id }: { id: string }) {
  const db = useDB()
  const user = useCurrentUser()
  const spot = db.spots.find((s) => s.id === id && s.ownerId === user?.id)
  const [toast, setToast] = useState<string | null>(null)
  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(null), 2000)
    return () => window.clearTimeout(t)
  }, [toast])

  if (!user) return null
  if (!spot) {
    return (
      <div className="screen-view">
        <div className="empty-state" style={{ flex: 1 }}>
          <div className="h3">Spot not found</div>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => navigate('/owner/spots', { replace: true })}>
            Back to your spots
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="screen-view">
      <div className="topbar">
        <button className="icon-btn" onClick={() => navigate('/owner/spots', { replace: true })} aria-label="Back">
          <Icon name="back" />
        </button>
        <h1 className="h2" style={{ flex: 1 }}>
          Manage spot
        </h1>
      </div>
      <div className="scroll">
        <div className="page" style={{ paddingBottom: 32 }}>
          <div className="row" style={{ gap: 12 }}>
            <SpotPhoto spot={spot} className="spot-thumb" />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700 }}>{spot.title}</div>
              <div className="caption">
                {spot.district} · {spot.chargerType} · {spot.powerKw} kW
              </div>
            </div>
          </div>
          <PriceSection key={`p-${spot.pricePerHour}`} spot={spot} ownerId={user.id} onSaved={() => setToast('Price saved')} />
          <ScheduleSection key={`s-${JSON.stringify(spot.availability)}`} spot={spot} ownerId={user.id} onSaved={() => setToast('Availability saved')} />
          <AccessSection key={`a-${spot.accessPin}-${spot.instructions}`} spot={spot} ownerId={user.id} onSaved={() => setToast('Access details saved')} />
        </div>
      </div>
      {toast && (
        <div className="toast" role="status">
          <Icon name="check" size={18} stroke={2.5} /> {toast}
        </div>
      )}
    </div>
  )
}

function PriceSection({ spot, ownerId, onSaved }: { spot: Spot; ownerId: string; onSaved: () => void }) {
  const [price, setPrice] = useState(spot.pricePerHour)
  const net = breakdown(price, 0.18).net
  return (
    <section className="manage-section" aria-labelledby="price-h">
      <h2 className="h2" id="price-h">
        Price
      </h2>
      <div className="stepper-row">
        <button className="icon-btn filled" aria-label="Lower price" disabled={price <= 20} onClick={() => setPrice((p) => Math.max(20, p - 1))}>
          <span style={{ fontSize: 24, fontWeight: 700 }}>−</span>
        </button>
        <div className="price-big" aria-live="polite">
          {hkd(price)}
          <span className="muted" style={{ fontSize: 16, fontWeight: 500 }}>
            {' '}
            / hour
          </span>
        </div>
        <button className="icon-btn filled" aria-label="Raise price" disabled={price >= 35} onClick={() => setPrice((p) => Math.min(35, p + 1))}>
          <span style={{ fontSize: 24, fontWeight: 700 }}>+</span>
        </button>
      </div>
      <input
        type="range"
        className="range"
        min={20}
        max={35}
        step={1}
        value={price}
        onChange={(e) => setPrice(+e.target.value)}
        aria-label="Price per hour"
      />
      <p className="caption" style={{ marginTop: 6 }}>
        Drivers pay {hkd(price)}/hour · you receive about {hk2(net)}
      </p>
      <button className="btn btn-primary block sm" style={{ marginTop: 12 }} disabled={price === spot.pricePerHour} onClick={() => setSpotPrice(spot.id, ownerId, price).ok && onSaved()}>
        Save price
      </button>
    </section>
  )
}

function ScheduleSection({ spot, ownerId, onSaved }: { spot: Spot; ownerId: string; onSaved: () => void }) {
  const [rows, setRows] = useState<DayRow[]>(() => rowsFrom(spot))
  const [tried, setTried] = useState(false)
  const set = (day: number, patch: Partial<DayRow>) => setRows((r) => r.map((x, i) => (i === day ? { ...x, ...patch } : x)))
  const errors = rows.map((r) => (r.on ? validateRange(r.start, r.end) : null))
  const preview = { availability: rows.flatMap((r, day) => (r.on ? [{ day, start: r.start, end: r.end }] : [])) }
  const summary = formatAvailability(preview).map((l) => l.label)

  const save = () => {
    setTried(true)
    if (errors.some(Boolean)) return
    const r = setSpotAvailability(spot.id, ownerId, rows.map((x) => (x.on ? { start: x.start, end: x.end } : null)))
    if (r.ok) onSaved()
  }

  return (
    <section className="manage-section" aria-labelledby="sched-h">
      <h2 className="h2" id="sched-h">
        Availability
      </h2>
      <p className="caption" style={{ marginTop: 4 }}>
        When drivers can book your bay. Existing bookings stay as they are.
      </p>
      <div className="row" style={{ gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
        <button className="chip" onClick={() => setRows((r) => r.map((x, d) => (d >= 1 && d <= 5 ? { on: true, start: '08:30', end: '19:00' } : { ...x, on: false })))}>
          Weekdays 08:30–19:00
        </button>
        <button className="chip" onClick={() => setRows((r) => r.map((x, d) => (d >= 2 && d <= 5 ? { ...r[1] } : x)))}>
          Copy Monday to all weekdays
        </button>
      </div>
      <ul className="sched-list">
        {WEEK.map((day) => {
          const r = rows[day]
          const err = (tried || r.end <= r.start) && errors[day]
          return (
            <li key={day} className={cx('sched-row', !r.on && 'off')} data-day={day}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 600 }}>{DAY_NAME[day]}</span>
                <label className="switch" aria-label={`${DAY_NAME[day]} available`}>
                  <input type="checkbox" role="switch" checked={r.on} onChange={(e) => set(day, { on: e.target.checked })} />
                  <span className="switch-track" aria-hidden />
                </label>
              </div>
              {r.on ? (
                <div className="row" style={{ gap: 10, marginTop: 8 }}>
                  <TimeSelect label={`${DAY_NAME[day]} from`} value={r.start} onChange={(v) => set(day, { start: v })} invalid={!!err} />
                  <span className="muted">to</span>
                  <TimeSelect label={`${DAY_NAME[day]} to`} value={r.end} onChange={(v) => set(day, { end: v })} invalid={!!err} />
                </div>
              ) : (
                <div className="caption" style={{ marginTop: 2 }}>
                  Not available
                </div>
              )}
              {err && (
                <div className="field-error" role="alert" style={{ marginTop: 6 }}>
                  {err}
                </div>
              )}
            </li>
          )
        })}
      </ul>
      <div className="summary-card" style={{ marginTop: 12 }} aria-label="Summary">
        <div className="caption">Drivers will see</div>
        {summary.length ? summary.map((l) => <div key={l} style={{ fontWeight: 600 }}>{l}</div>) : <div style={{ fontWeight: 600 }}>Not available any day</div>}
      </div>
      <button className="btn btn-primary block sm" style={{ marginTop: 12 }} onClick={save}>
        Save availability
      </button>
    </section>
  )
}

function TimeSelect({ label, value, onChange, invalid }: { label: string; value: string; onChange: (v: string) => void; invalid?: boolean }) {
  return (
    <select className={cx('input time-select', invalid && 'invalid')} aria-label={label} value={value} onChange={(e) => onChange(e.target.value)}>
      {TIMES.map((t) => (
        <option key={t} value={t}>
          {t}
        </option>
      ))}
    </select>
  )
}

function AccessSection({ spot, ownerId, onSaved }: { spot: Spot; ownerId: string; onSaved: () => void }) {
  const [pin, setPin] = useState(spot.accessPin)
  const [text, setText] = useState(spot.instructions)
  const [tried, setTried] = useState(false)
  const pinErr = validatePin(pin)
  const save = () => {
    setTried(true)
    if (pinErr) return
    if (setSpotAccess(spot.id, ownerId, pin, text).ok) onSaved()
  }
  return (
    <section className="manage-section" aria-labelledby="access-h">
      <h2 className="h2" id="access-h">
        Access
      </h2>
      <p className="caption" style={{ marginTop: 4 }}>
        Drivers see this only after they pay.
      </p>
      <div className="stack" style={{ gap: 14, marginTop: 12 }}>
        <TextField label="Gate PIN" value={pin} onChange={(v) => setPin(v.replace(/\D/g, '').slice(0, 4))} error={tried ? pinErr : null} inputMode="numeric" autoComplete="off" />
        <div className="field">
          <label htmlFor="instr">Access instructions</label>
          <textarea id="instr" className="input textarea" maxLength={200} value={text} onChange={(e) => setText(e.target.value.slice(0, 200))} rows={3} />
          <div className="field-hint" style={{ textAlign: 'right' }}>
            {text.length}/200
          </div>
        </div>
      </div>
      <button className="btn btn-primary block sm" style={{ marginTop: 8 }} onClick={save}>
        Save access
      </button>
    </section>
  )
}
