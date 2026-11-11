// Charging session (diagram 1: "Start charging and monitor progress" → "live charging data"
// → "state of charge" → "Booking session complete"). Demo time: ~25 s start to full.

import { useEffect, useRef, useState } from 'react'
import { Icon } from '../../components/Icon'
import { useStatusBar } from '../../components/PhoneFrame'
import { fmtDuration } from '../../lib/booking'
import { completeSession } from '../../lib/bookingActions'
import { navigate } from '../../lib/router'
import { sessionState } from '../../lib/session'
import { useCurrentUser, useDB } from '../../lib/store'
import { cx, hkd } from '../../lib/util'

export function Session({ id }: { id: string }) {
  useStatusBar('dark')
  const db = useDB()
  const user = useCurrentUser()
  const b = db.bookings.find((x) => x.id === id && x.driverId === user?.id)
  const spot = b && db.spots.find((s) => s.id === b.spotId)
  const [now, setNow] = useState(Date.now())
  const [confirmStop, setConfirmStop] = useState(false)
  const completing = useRef(false)

  const live = b?.status === 'active'
  useEffect(() => {
    if (!live) return
    const t = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(t)
  }, [live])

  const st = b && spot ? sessionState(b, spot, now) : null

  // Reached the end → complete once (any window may do it; the action refuses a second time).
  useEffect(() => {
    if (live && st?.done && !completing.current) {
      completing.current = true
      completeSession(b!.id)
    }
  }, [live, st?.done, b])

  const target = !b ? '/app/bookings' : b.status === 'paid' ? `/app/confirm/${b.id}` : b.status !== 'active' && b.status !== 'completed' ? `/app/booking/${b.id}` : null
  useEffect(() => {
    if (target) navigate(target, { replace: true })
  }, [target])
  if (!b || !spot || !st || target) return null

  if (b.status === 'completed') {
    const started = b.startedAt ? new Date(b.startedAt) : null
    return (
      <div className="screen-view dark session">
        <div className="scroll">
          <div className="page" style={{ paddingTop: 40, paddingBottom: 24, textAlign: 'center' }}>
            <span className="status-icon green pop" style={{ width: 72, height: 72 }} aria-hidden>
              <Icon name="check" size={38} stroke={3} />
            </span>
            <h1 className="h1" style={{ marginTop: 18 }}>
              Session complete
            </h1>
            <p className="session-sub" style={{ marginTop: 6 }}>
              {spot.title}
            </p>
            <div className="session-tiles" style={{ marginTop: 28 }}>
              <Tile label="Energy delivered" value={`${(b.energyKwh ?? 0).toFixed(1)} kWh`} />
              <Tile label="Booked time" value={fmtDuration(b.durationMinutes)} />
              <Tile label="Total paid" value={hkd(b.price)} />
              <Tile label="Card" value={`•••• ${b.paymentLast4 ?? '----'}`} />
            </div>
            {started && (
              <p className="session-sub" style={{ marginTop: 16, fontSize: 13 }}>
                Charged to the card ending {b.paymentLast4}. The owner is paid after the session.
              </p>
            )}
          </div>
        </div>
        <div className="bottom-bar stack" style={{ gap: 10 }}>
          {!b.reviewed && (
            <button className="btn btn-inverse block" onClick={() => navigate(`/app/rate/${b.id}`, { replace: true })}>
              Rate your experience
            </button>
          )}
          <button className="btn btn-ghost-light block" onClick={() => navigate('/app/bookings', { replace: true })}>
            Done
          </button>
        </div>
      </div>
    )
  }

  const R = 92
  const C = 2 * Math.PI * R
  const power = Math.round(Math.min(spot.powerKw, 60) * (0.93 + 0.05 * Math.sin(now / 900)) * 10) / 10

  return (
    <div className="screen-view dark session">
      <div className="scroll">
        <div className="page" style={{ paddingTop: 20, paddingBottom: 20 }}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <div style={{ minWidth: 0 }}>
              <div className="overline session-sub">Charging session</div>
              <div style={{ fontWeight: 700, marginTop: 2 }}>{spot.title}</div>
            </div>
            <span className="live-pill">
              <span className="live-dot" /> Live
            </span>
          </div>

          <div className="ring-wrap" role="img" aria-label={`Battery ${st.batteryPct}%`} data-progress={st.progress.toFixed(2)}>
            <svg viewBox="0 0 220 220" width="220" height="220">
              <circle cx="110" cy="110" r={R} fill="none" stroke="#1f2a37" strokeWidth="14" />
              <circle
                cx="110"
                cy="110"
                r={R}
                fill="none"
                stroke="var(--blue)"
                strokeWidth="14"
                strokeLinecap="round"
                strokeDasharray={C}
                strokeDashoffset={C * (1 - st.batteryPct / 100)}
                transform="rotate(-90 110 110)"
                style={{ transition: 'stroke-dashoffset 250ms linear' }}
              />
            </svg>
            <div className="ring-label">
              <div className="ring-pct">{st.batteryPct}%</div>
              <div className="session-sub">battery</div>
            </div>
          </div>

          <p className="row session-status">
            <span className="live-dot" /> Charging — live data from the charger
          </p>

          <div className="session-tiles">
            <Tile label="Energy delivered" value={`${st.energyKwh.toFixed(1)} kWh`} />
            <Tile label="Time remaining" value={`${st.minutesLeft} min left`} />
            <Tile label="Power" value={`${power.toFixed(1)} kW`} />
            <Tile label="Cost" value={hkd(b.price)} />
          </div>
        </div>
      </div>
      <div className="bottom-bar">
        <button
          className={cx('btn block', confirmStop ? 'btn-danger' : 'btn-inverse')}
          onClick={() => {
            if (!confirmStop) return setConfirmStop(true)
            completing.current = true
            completeSession(b.id)
          }}
        >
          {confirmStop ? 'Tap again to stop charging' : 'Stop charging'}
        </button>
      </div>
    </div>
  )
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="session-tile">
      <div className="session-sub" style={{ fontSize: 12 }}>
        {label}
      </div>
      <div className="mono" style={{ fontWeight: 800, fontSize: 20, marginTop: 2 }}>
        {value}
      </div>
    </div>
  )
}
