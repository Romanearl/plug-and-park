// Owner → Manage spot: price, weekly availability scheduler (proposal's core owner feature),
// and access details (diagram 3: "Update access codes, photos, etc. when needed").

import { useEffect, useState } from 'react'
import { TextField } from '../../components/Field'
import { Icon } from '../../components/Icon'
import { daysFromRows, rowErrors, rowsFromDays, ScheduleEditor, type DayRow } from '../../components/ScheduleEditor'
import { SpotPhoto } from '../../components/SpotPhoto'
import type { Spot } from '../../data/types'
import { windowsForDay } from '../../lib/availability'
import { breakdown, hk2, validatePin } from '../../lib/money'
import { setSpotAccess, setSpotAvailability, setSpotPrice } from '../../lib/ownerActions'
import { navigate } from '../../lib/router'
import { useCurrentUser, useDB } from '../../lib/store'
import { hkd } from '../../lib/util'

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
      </div>
      <div className="scroll">
        <div className="page" style={{ paddingBottom: 32 }}>
          <h1 className="h1" style={{ marginBottom: 16 }}>
            Manage spot
          </h1>
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
  const [rows, setRows] = useState<DayRow[]>(() => rowsFromDays(Array.from({ length: 7 }, (_, d) => windowsForDay(spot, d)[0] ?? null)))
  const [tried, setTried] = useState(false)
  const save = () => {
    setTried(true)
    if (rowErrors(rows).some(Boolean)) return
    if (setSpotAvailability(spot.id, ownerId, daysFromRows(rows)).ok) onSaved()
  }
  return (
    <section className="manage-section" aria-labelledby="sched-h">
      <h2 className="h2" id="sched-h">
        Availability
      </h2>
      <p className="caption" style={{ marginTop: 4 }}>
        When drivers can book your bay. Existing bookings stay as they are.
      </p>
      <ScheduleEditor rows={rows} onChange={setRows} showErrors={tried} />
      <button className="btn btn-primary block sm" style={{ marginTop: 12 }} onClick={save}>
        Save availability
      </button>
    </section>
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
