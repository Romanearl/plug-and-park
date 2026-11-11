// Confirmation (diagram 1: "Provide access method (QR/PIN)" → "Go to location and verify arrival").

import { useEffect, useRef, useState } from 'react'
import { Icon } from '../../components/Icon'
import { QrCode } from '../../components/QrCode'
import { endOf, fmtDuration, hhmm } from '../../lib/booking'
import { startSession } from '../../lib/bookingActions'
import { navigate } from '../../lib/router'
import { useCurrentUser, useDB } from '../../lib/store'
import { fmtDate } from '../../lib/util'

export function Confirmation({ id }: { id: string }) {
  const db = useDB()
  const user = useCurrentUser()
  const b = db.bookings.find((x) => x.id === id && x.driverId === user?.id)
  const spot = b && db.spots.find((s) => s.id === b.spotId)
  const [verifying, setVerifying] = useState(false)
  const [copied, setCopied] = useState(false)
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  // Access only exists once paid. Active → the session; anything else → the status screen.
  const target = !b ? '/app/bookings' : b.status === 'active' ? `/app/session/${b.id}` : b.status !== 'paid' && !verifying ? `/app/booking/${b.id}` : null
  useEffect(() => {
    if (target) navigate(target, { replace: true })
  }, [target])
  if (!b || !spot || target) return null

  const start = new Date(b.start)
  const pin = b.pin ?? spot.accessPin

  const arrive = () => {
    setVerifying(true)
    timer.current = window.setTimeout(() => {
      const r = startSession(b.id, b.driverId)
      navigate(`/app/session/${b.id}`, { replace: true })
      if (!r.ok) setVerifying(false)
    }, 1000)
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(pin)
    } catch {
      /* clipboard blocked — the PIN is on screen anyway */
    }
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="screen-view">
      <div className="topbar">
        <button className="icon-btn" onClick={() => navigate('/app/bookings', { replace: true })} aria-label="Back">
          <Icon name="back" />
        </button>
      </div>
      <div className="scroll">
        <div className="page" style={{ paddingBottom: 24, textAlign: 'center' }}>
          <span className="status-icon green pop" aria-hidden style={{ width: 64, height: 64 }}>
            <Icon name="check" size={34} stroke={3} />
          </span>
          <h1 className="h1" style={{ marginTop: 14 }}>
            You're booked!
          </h1>
          <p className="muted" style={{ marginTop: 6 }}>
            Paid with card ending {b.paymentLast4}. Show this at the bay.
          </p>

          <section className="access-card" aria-label="Access">
            <QrCode value={b.qrPayload ?? `PLUGPARK|${b.id}|${pin}`} size={184} label="Access QR code" />
            <div className="overline muted" style={{ marginTop: 14 }}>
              Gate PIN
            </div>
            <div className="row" style={{ justifyContent: 'center', gap: 12, marginTop: 4 }}>
              <span className="pin-digits" aria-label={`PIN ${pin.split('').join(' ')}`}>
                {pin.split('').map((d, i) => (
                  <span key={i}>{d}</span>
                ))}
              </span>
              <button className="btn btn-secondary sm" onClick={() => void copy()}>
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </section>

          <section className="card flat" style={{ marginTop: 16, textAlign: 'left' }}>
            <div style={{ fontWeight: 700 }}>{spot.title}</div>
            <div className="caption">{spot.address}</div>
            <p style={{ marginTop: 10, fontSize: 15 }}>{spot.instructions}</p>
            <dl className="kv">
              <div>
                <dt>Date</dt>
                <dd>{fmtDate(start)}</dd>
              </div>
              <div>
                <dt>Time</dt>
                <dd>
                  {hhmm(start)}–{hhmm(endOf(b))}
                </dd>
              </div>
              <div>
                <dt>Duration</dt>
                <dd>{fmtDuration(b.durationMinutes)}</dd>
              </div>
            </dl>
            <a
              className="btn btn-ghost block"
              style={{ marginTop: 12 }}
              href={`https://www.openstreetmap.org/?mlat=${spot.lat}&mlon=${spot.lng}#map=17/${spot.lat}/${spot.lng}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Icon name="map" size={20} /> Open in Maps
            </a>
          </section>
        </div>
      </div>
      <div className="bottom-bar">
        <p className="caption" style={{ textAlign: 'center', marginBottom: 8 }}>
          Demo: you can start right away.
        </p>
        <button className="btn btn-primary block" onClick={arrive} disabled={verifying} aria-busy={verifying}>
          {verifying ? (
            <>
              <span className="spinner" aria-hidden /> Verifying access…
            </>
          ) : (
            'I’ve arrived — start charging'
          )}
        </button>
      </div>
    </div>
  )
}
