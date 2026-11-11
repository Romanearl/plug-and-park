// Booking status: a 5-step stepper + a status card that changes live when the owner acts.

import { useState } from 'react'
import { Icon } from '../../components/Icon'
import { SpotPhoto } from '../../components/SpotPhoto'
import type { Booking } from '../../data/types'
import { endOf, fmtDuration, hhmm } from '../../lib/booking'
import { cancelRequest } from '../../lib/bookingActions'
import { navigate } from '../../lib/router'
import { useCurrentUser, useDB } from '../../lib/store'
import { cx, fmtDate, hkd } from '../../lib/util'

const STEPS = ['Requested', 'Approved', 'Paid', 'Charging', 'Done']

/** Index of the current step; steps before it are done. -1 marks the failed step for declined / cancelled. */
function stepState(b: Booking): { current: number; failed?: number } {
  switch (b.status) {
    case 'pending':
      return { current: 0 }
    case 'confirmed':
      return { current: 2 }
    case 'paid':
      return { current: 3 }
    case 'active':
      return { current: 3 }
    case 'completed':
      return { current: 5 }
    case 'declined':
      return { current: 1, failed: 1 }
    case 'cancelled':
      return { current: 0, failed: 0 }
  }
}

export function BookingStatus({ id }: { id: string }) {
  const db = useDB()
  const user = useCurrentUser()
  const [confirmCancel, setConfirmCancel] = useState(false)
  const b = db.bookings.find((x) => x.id === id && x.driverId === user?.id)
  const spot = b && db.spots.find((s) => s.id === b.spotId)
  const owner = b && db.users.find((u) => u.id === b.ownerId)
  const toBookings = () => navigate('/app/bookings', { replace: true })

  if (!b || !spot) {
    return (
      <div className="screen-view">
        <div className="topbar">
          <button className="icon-btn" onClick={toBookings} aria-label="Back">
            <Icon name="back" />
          </button>
        </div>
        <div className="empty-state">
          <span className="empty-icon">
            <Icon name="calendar" size={32} />
          </span>
          <div className="h3" style={{ marginTop: 16 }}>
            Booking not found
          </div>
          <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={() => navigate('/app', { replace: true })}>
            Find a charger
          </button>
        </div>
      </div>
    )
  }

  const { current, failed } = stepState(b)
  const start = new Date(b.start)
  const ownerFirst = owner?.name ?? 'the owner'

  return (
    <div className="screen-view">
      <div className="topbar">
        <button className="icon-btn" onClick={toBookings} aria-label="Back">
          <Icon name="back" />
        </button>
      </div>
      <div className="scroll">
        <div className="page" style={{ paddingBottom: 28 }}>
          <h1 className="h1" style={{ marginBottom: 16 }}>
            Your booking
          </h1>
          <ol className="stepper" aria-label="Booking progress">
            {STEPS.map((label, i) => {
              const state = failed === i ? 'failed' : i < current ? 'done' : i === current ? 'current' : 'todo'
              return (
                <li key={label} className={state} aria-current={state === 'current' ? 'step' : undefined}>
                  <span className="dot">
                    {state === 'done' && <Icon name="check" size={14} stroke={3} />}
                    {state === 'failed' && <Icon name="close" size={14} stroke={3} />}
                  </span>
                  <span className="label">{label}</span>
                </li>
              )
            })}
          </ol>

          <section className={cx('status-card', b.status)} aria-live="polite" data-status={b.status}>
            {b.status === 'pending' && (
              <>
                <span className="pulse-dot" aria-hidden>
                  <Icon name="clock" size={26} />
                </span>
                <h2 className="h2" style={{ marginTop: 14 }}>
                  Waiting for {ownerFirst} to approve
                </h2>
                <p className="muted" style={{ marginTop: 4 }}>
                  Owners usually reply within minutes. You won't be charged until they approve.
                </p>
                <button
                  className={cx('btn block', confirmCancel ? 'btn-danger' : 'btn-secondary')}
                  style={{ marginTop: 18 }}
                  onClick={() => {
                    if (!confirmCancel) return setConfirmCancel(true)
                    cancelRequest(b.id, b.driverId)
                    setConfirmCancel(false)
                  }}
                >
                  {confirmCancel ? 'Tap again to cancel request' : 'Cancel request'}
                </button>
              </>
            )}
            {b.status === 'confirmed' && (
              <>
                <span className="status-icon green pop" aria-hidden>
                  <Icon name="check" size={30} stroke={3} />
                </span>
                <h2 className="h2" style={{ marginTop: 14 }}>
                  Approved! Pay to confirm your booking
                </h2>
                <p className="muted" style={{ marginTop: 4 }}>
                  {ownerFirst} accepted your request. Pay now to lock in the slot and get your access code.
                </p>
                <button className="btn btn-primary block" style={{ marginTop: 18 }} onClick={() => navigate(`/app/pay/${b.id}`)}>
                  Pay {hkd(b.price)}
                </button>
              </>
            )}
            {b.status === 'declined' && (
              <>
                <span className="status-icon red" aria-hidden>
                  <Icon name="close" size={30} stroke={3} />
                </span>
                <h2 className="h2" style={{ marginTop: 14 }}>
                  The owner can't host this booking
                </h2>
                <p className="muted" style={{ marginTop: 4 }}>
                  Reason: {b.declineReason ?? 'Not given'}. You haven't been charged.
                </p>
                <button className="btn btn-primary block" style={{ marginTop: 18 }} onClick={() => navigate('/app', { replace: true })}>
                  Find another charger
                </button>
              </>
            )}
            {b.status === 'cancelled' && (
              <>
                <span className="status-icon grey" aria-hidden>
                  <Icon name="close" size={30} stroke={3} />
                </span>
                <h2 className="h2" style={{ marginTop: 14 }}>
                  You cancelled this request
                </h2>
                <button className="btn btn-secondary block" style={{ marginTop: 18 }} onClick={() => navigate('/app', { replace: true })}>
                  Find another charger
                </button>
              </>
            )}
            {(b.status === 'paid' || b.status === 'active' || b.status === 'completed') && (
              <>
                <span className="status-icon green" aria-hidden>
                  <Icon name="check" size={30} stroke={3} />
                </span>
                <h2 className="h2" style={{ marginTop: 14 }}>
                  {b.status === 'paid' ? 'Paid — you’re all set' : b.status === 'active' ? 'Charging now' : 'Session complete'}
                </h2>
                {b.status === 'paid' && (
                  <button className="btn btn-primary block" style={{ marginTop: 18 }} onClick={() => navigate(`/app/confirm/${b.id}`)}>
                    View access (QR + PIN)
                  </button>
                )}
                {b.status === 'active' && (
                  <button className="btn btn-primary block" style={{ marginTop: 18 }} onClick={() => navigate(`/app/session/${b.id}`)}>
                    Resume session
                  </button>
                )}
                {b.status === 'completed' && (
                  <>
                    <div className="receipt">
                      <div>
                        <span>Energy delivered</span>
                        <span>{(b.energyKwh ?? 0).toFixed(1)} kWh</span>
                      </div>
                      <div>
                        <span>Paid with card</span>
                        <span>•••• {b.paymentLast4 ?? '----'}</span>
                      </div>
                      <div className="total">
                        <span>Total</span>
                        <span>{hkd(b.price)}</span>
                      </div>
                    </div>
                    {!b.reviewed && (
                      <button className="btn btn-primary block" style={{ marginTop: 18 }} onClick={() => navigate(`/app/rate/${b.id}`)}>
                        Rate your experience
                      </button>
                    )}
                  </>
                )}
              </>
            )}
          </section>

          <section className="card flat" style={{ marginTop: 16 }}>
            <div className="row" style={{ gap: 12 }}>
              <SpotPhoto spot={spot} className="spot-thumb" />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700 }}>{spot.title}</div>
                <div className="caption">{spot.address}</div>
              </div>
            </div>
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
              <div>
                <dt>Total</dt>
                <dd>{hkd(b.price)}</dd>
              </div>
            </dl>
          </section>
        </div>
      </div>
    </div>
  )
}
