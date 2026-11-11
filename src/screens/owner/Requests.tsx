// Owner → Requests: pending requests (with the driver's rating — the proposal's
// "review requests based on driver rating") and upcoming confirmed / paid bookings.

import { useEffect, useState } from 'react'
import { BottomSheet } from '../../components/BottomSheet'
import { Icon } from '../../components/Icon'
import type { Booking, Spot, User } from '../../data/types'
import { endOf, fmtDuration, hhmm } from '../../lib/booking'
import { approveBooking, declineBooking, DECLINE_REASONS } from '../../lib/bookingActions'
import { awaitingSetup } from '../../lib/applyActions'
import { netOf } from '../../lib/money'
import { navigate } from '../../lib/router'
import { useCurrentUser, useDB } from '../../lib/store'
import { cx, fmtDate, hkd } from '../../lib/util'

/** "Wong Mei Ling" → "Mei Ling" (HK order: surname first); "Sarah Ng" → "Sarah". */
export function givenName(name: string) {
  const parts = name.replace(/\(.*\)/, '').trim().split(/\s+/)
  return parts.length >= 3 ? parts.slice(1).join(' ') : parts[0]
}

export function Requests() {
  const db = useDB()
  const user = useCurrentUser()
  const [declining, setDeclining] = useState<Booking | null>(null)
  const [approved, setApproved] = useState<Record<string, 'ok' | 'taken'>>({})
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    if (!notice) return
    const t = window.setTimeout(() => setNotice(null), 3500)
    return () => window.clearTimeout(t)
  }, [notice])

  if (!user) return null
  const mySpots = db.spots.filter((s) => s.ownerId === user.id)
  if (mySpots.length === 0) return <Welcome name={givenName(user.name)} />
  const applications = mySpots.filter((s) => s.reviewStatus !== 'approved' || awaitingSetup(s))
  const mine = db.bookings.filter((b) => b.ownerId === user.id)
  // Cards that were just approved stay in place for a moment to show the success state.
  const pending = mine
    .filter((b) => b.status === 'pending' || approved[b.id])
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const waiting = mine.filter((b) => b.status === 'pending').length
  const upcoming = mine
    .filter((b) => (b.status === 'active' || ((b.status === 'confirmed' || b.status === 'paid') && endOf(b).getTime() > Date.now())) && !approved[b.id])
    .sort((a, b) => a.start.localeCompare(b.start))

  const history = mine
    .filter((b) => b.status === 'declined' || b.status === 'cancelled' || b.status === 'completed')
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))

  const approve = (b: Booking) => {
    const r = approveBooking(b.id)
    setApproved((s) => ({ ...s, [b.id]: r.ok ? 'ok' : 'taken' }))
    if (!r.ok) setNotice(`Declined automatically: ${r.reason.toLowerCase()}`)
    window.setTimeout(
      () =>
        setApproved((s) => {
          const n = { ...s }
          delete n[b.id]
          return n
        }),
      1100,
    )
  }

  return (
    <div className="screen-view">
      <div className="scroll">
        <div className="page rise" style={{ paddingTop: 20, paddingBottom: 28 }}>
          <h1 className="h1">Hi, {givenName(user.name)}</h1>
          <p className="muted" style={{ marginTop: 4 }} aria-live="polite">
            {waiting === 0 ? 'No requests waiting' : waiting === 1 ? '1 request waiting' : `${waiting} requests waiting`}
          </p>

          {applications.map((s) => (
            <ApplicationCard key={s.id} spot={s} />
          ))}

          {notice && (
            <div className="banner error" role="alert" style={{ marginTop: 16 }}>
              <Icon name="info" size={20} /> {notice}
            </div>
          )}

          {pending.length === 0 ? (
            <div className="card flat" style={{ marginTop: 20, textAlign: 'center', padding: '28px 20px' }}>
              <span className="empty-icon" style={{ width: 56, height: 56 }}>
                <Icon name="bolt" size={26} />
              </span>
              <div className="h3" style={{ marginTop: 12 }}>
                No requests right now
              </div>
              <p className="muted" style={{ marginTop: 4 }}>
                We'll notify you when a driver books.
              </p>
            </div>
          ) : (
            <ul className="request-list">
              {pending.map((b) => (
                <li key={b.id}>
                  <RequestCard
                    booking={b}
                    driver={db.users.find((u) => u.id === b.driverId)}
                    spotTitle={db.spots.find((s) => s.id === b.spotId)?.title ?? 'Your charger'}
                    state={approved[b.id]}
                    onApprove={() => approve(b)}
                    onDecline={() => setDeclining(b)}
                  />
                </li>
              ))}
            </ul>
          )}

          <h2 className="h2" style={{ marginTop: 32 }}>
            Upcoming
          </h2>
          {upcoming.length === 0 ? (
            <p className="muted" style={{ marginTop: 8 }}>
              Approved bookings show up here.
            </p>
          ) : (
            <ul className="upcoming-list">
              {upcoming.map((b) => {
                const driver = db.users.find((u) => u.id === b.driverId)
                const start = new Date(b.start)
                return (
                  <li key={b.id} className="list-row" data-booking={b.id}>
                    <span className="avatar sm">{driver?.name[0] ?? 'D'}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600 }}>{driver?.name ?? 'Driver'}</div>
                      <div className="caption">
                        {fmtDate(start)} · {hhmm(start)}–{hhmm(endOf(b))}
                      </div>
                    </div>
                    {b.status === 'active' ? (
                      <span className="badge green live-badge">
                        <span className="live-dot" /> Charging now
                      </span>
                    ) : (
                      <span className={cx('badge', b.status === 'paid' ? 'green' : 'amber')}>
                        {b.status === 'paid' ? 'Paid' : 'Awaiting payment'}
                      </span>
                    )}
                  </li>
                )
              })}
            </ul>
          )}

          <h2 className="h2" style={{ marginTop: 32 }}>
            History
          </h2>
          {history.length === 0 ? (
            <p className="muted" style={{ marginTop: 8 }}>
              Finished, declined and cancelled requests show up here.
            </p>
          ) : (
            <ul className="upcoming-list history-list">
              {history.map((b) => {
                const driver = db.users.find((u) => u.id === b.driverId)
                const start = new Date(b.start)
                const outcome =
                  b.status === 'completed'
                    ? { label: 'Completed', tone: 'green' }
                    : b.status === 'declined'
                      ? { label: b.declineReason ? `Declined · ${b.declineReason}` : 'Declined', tone: 'red' }
                      : { label: 'Cancelled by driver', tone: '' }
                return (
                  <li key={b.id} className="list-row" data-booking={b.id}>
                    <span className="avatar sm">{driver?.name[0] ?? 'D'}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600 }}>{driver?.name ?? 'Driver'}</div>
                      <div className="caption">
                        {fmtDate(start)} · {hhmm(start)}–{hhmm(endOf(b))}
                      </div>
                      <span className={cx('badge', outcome.tone)} style={{ marginTop: 4, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {outcome.label}
                      </span>
                    </div>
                    {b.status === 'completed' && <b>{hkd(netOf(b))}</b>}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>

      <BottomSheet open={!!declining} onClose={() => setDeclining(null)} title="Decline request" labelId="decline-title">
        <p className="muted">Let the driver know why. They won't be charged.</p>
        <div className="stack" style={{ marginTop: 14, gap: 10 }}>
          {DECLINE_REASONS.map((r) => (
            <button
              key={r}
              className="btn btn-secondary block"
              onClick={() => {
                if (declining) declineBooking(declining.id, r)
                setDeclining(null)
              }}
            >
              {r}
            </button>
          ))}
        </div>
      </BottomSheet>
    </div>
  )
}

function RequestCard({
  booking: b,
  driver,
  spotTitle,
  state,
  onApprove,
  onDecline,
}: {
  booking: Booking
  driver?: User
  spotTitle: string
  state?: 'ok' | 'taken'
  onApprove: () => void
  onDecline: () => void
}) {
  const start = new Date(b.start)
  const earn = netOf(b)
  return (
    <article className={cx('card request-card', state && `done-${state}`)} data-booking={b.id}>
      <div className="row" style={{ gap: 12 }}>
        <span className="avatar">{driver?.name[0] ?? 'D'}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700 }}>{driver?.name ?? 'Driver'}</div>
          <div className="caption row" style={{ gap: 4 }}>
            <Icon name="star" size={13} fill="currentColor" stroke={0} />
            <b style={{ color: 'var(--ink)' }}>{driver ? (driver.ratingCount ? driver.rating.toFixed(1) : 'New') : '–'}</b>
            {driver?.ratingCount ? `(${driver.ratingCount} ratings)` : ''} · {driver?.vehicle ?? 'EV'}
          </div>
        </div>
      </div>
      <div className="request-slot">
        <div style={{ fontWeight: 600 }}>{spotTitle}</div>
        <div className="caption">
          {fmtDate(start)} · {hhmm(start)}–{hhmm(endOf(b))} · {fmtDuration(b.durationMinutes)}
        </div>
      </div>
      <div className="row" style={{ justifyContent: 'space-between', marginTop: 12 }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 18 }}>You earn {hkd(earn)}</div>
          <div className="caption">after {Math.round(b.commissionRate * 100)}% service fee and 3% payment fee</div>
        </div>
      </div>
      {state ? (
        <div className={cx('request-result', state)} role="status">
          <Icon name={state === 'ok' ? 'check' : 'close'} size={18} stroke={3} />
          {state === 'ok' ? 'Approved — the driver has been notified' : 'Slot no longer available — declined'}
        </div>
      ) : (
        <div className="row" style={{ gap: 10, marginTop: 14 }}>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onDecline}>
            Decline
          </button>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={onApprove}>
            Approve
          </button>
        </div>
      )}
    </article>
  )
}

function Welcome({ name }: { name: string }) {
  return (
    <div className="screen-view">
      <div className="scroll">
        <div className="page rise" style={{ paddingTop: 20, paddingBottom: 28 }}>
          <h1 className="h1">Hi, {name}</h1>
          <section className="welcome-card">
            <span className="empty-icon" style={{ background: 'var(--blue)', color: 'var(--ink)' }}>
              <Icon name="plug" size={30} />
            </span>
            <h2 className="h2" style={{ marginTop: 16 }}>
              List your charger and earn while you’re at work
            </h2>
            <ul className="benefits">
              <li>
                <Icon name="wallet" size={20} /> Earn HK$20–35 per hour
              </li>
              <li>
                <Icon name="check" size={20} /> You approve every booking
              </li>
              <li>
                <Icon name="bolt" size={20} /> Paid out by FPS
              </li>
            </ul>
            <button className="btn btn-primary block" style={{ marginTop: 18 }} onClick={() => navigate('/owner/apply')}>
              List my charger
            </button>
          </section>
        </div>
      </div>
    </div>
  )
}

function ApplicationCard({ spot }: { spot: Spot }) {
  if (spot.reviewStatus === 'changes_requested')
    return (
      <section className="app-card amber" data-application={spot.id}>
        <div className="row" style={{ gap: 8, fontWeight: 700 }}>
          <Icon name="info" size={20} /> Plug &amp; Park asked for changes
        </div>
        <div className="clamp-2" style={{ marginTop: 4, fontWeight: 600 }}>
          {spot.title}
        </div>
        <p style={{ marginTop: 4, fontSize: 15 }}>“{spot.reviewNote}”</p>
        <button className="btn btn-primary block sm" style={{ marginTop: 12 }} onClick={() => navigate(`/owner/apply/${spot.id}`)}>
          Edit application
        </button>
      </section>
    )
  if (spot.reviewStatus === 'in_review')
    return (
      <section className="app-card" data-application={spot.id}>
        <div className="row" style={{ gap: 8, fontWeight: 700 }}>
          <span className="pulse-dot small" aria-hidden /> Application under review
        </div>
        <div className="clamp-2" style={{ marginTop: 4, fontWeight: 600 }}>
          {spot.title}
        </div>
        <p className="caption" style={{ marginTop: 2 }}>
          Not visible to drivers yet. We’ll notify you when it’s approved.
        </p>
      </section>
    )
  return (
    <section className="app-card green" data-application={spot.id}>
      <div className="row" style={{ gap: 8, fontWeight: 700 }}>
        <Icon name="check" size={20} stroke={3} /> You’re approved — one last step
      </div>
      <div className="clamp-2" style={{ marginTop: 4, fontWeight: 600 }}>
        {spot.title}
      </div>
      <p style={{ marginTop: 4, fontSize: 15 }}>Add your gate PIN and payout details to go live.</p>
      <button className="btn btn-primary block sm" style={{ marginTop: 12 }} onClick={() => navigate(`/owner/setup/${spot.id}`)}>
        Finish setup
      </button>
    </section>
  )
}
