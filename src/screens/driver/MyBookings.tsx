// Bookings: Upcoming (pending, confirmed, paid, active) and Past (completed, declined, cancelled),
// each card with the one action that fits its status.

import { useState } from 'react'
import { Icon } from '../../components/Icon'
import { SpotPhoto } from '../../components/SpotPhoto'
import type { Booking, BookingStatus } from '../../data/types'
import { endOf, hhmm } from '../../lib/booking'
import { navigate } from '../../lib/router'
import { useCurrentUser, useDB } from '../../lib/store'
import { cx, fmtDate } from '../../lib/util'

const UPCOMING: BookingStatus[] = ['pending', 'confirmed', 'paid', 'active']

export const STATUS_BADGE: Record<BookingStatus, { label: string; tone: string }> = {
  pending: { label: 'Waiting for owner', tone: 'amber' },
  confirmed: { label: 'Approved — pay now', tone: 'blue' },
  paid: { label: 'Paid', tone: 'green' },
  active: { label: 'Charging now', tone: 'green' },
  completed: { label: 'Completed', tone: '' },
  declined: { label: 'Declined', tone: 'red' },
  cancelled: { label: 'Cancelled', tone: '' },
}

/** The one action that fits a booking's status. */
export function bookingAction(b: Booking): { label: string; to: string; primary?: boolean } {
  switch (b.status) {
    case 'pending':
      return { label: 'View request', to: `/app/booking/${b.id}` }
    case 'confirmed':
      return { label: 'Pay now', to: `/app/pay/${b.id}`, primary: true }
    case 'paid':
      return { label: 'View access', to: `/app/confirm/${b.id}`, primary: true }
    case 'active':
      return { label: 'Resume session', to: `/app/session/${b.id}`, primary: true }
    case 'completed':
      return b.reviewed ? { label: 'Book again', to: `/app/spot/${b.spotId}` } : { label: 'Rate', to: `/app/rate/${b.id}`, primary: true }
    default:
      return { label: 'Book again', to: `/app/spot/${b.spotId}` }
  }
}

export function MyBookings() {
  const db = useDB()
  const user = useCurrentUser()
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming')
  if (!user) return null
  const mine = db.bookings.filter((b) => b.driverId === user.id)
  const list =
    tab === 'upcoming'
      ? mine.filter((b) => UPCOMING.includes(b.status)).sort((a, b) => a.start.localeCompare(b.start))
      : mine.filter((b) => !UPCOMING.includes(b.status)).sort((a, b) => b.start.localeCompare(a.start))

  return (
    <div className="screen-view">
      <div className="scroll">
        <div className="page rise" style={{ paddingTop: 20, paddingBottom: 24 }}>
          <h1 className="h1">Bookings</h1>
          <div className="segmented wide" role="tablist" aria-label="Bookings" style={{ marginTop: 16 }}>
            {(['upcoming', 'past'] as const).map((k) => (
              <button key={k} role="tab" aria-selected={tab === k} className={cx(tab === k && 'active')} onClick={() => setTab(k)}>
                {k === 'upcoming' ? 'Upcoming' : 'Past'}
              </button>
            ))}
          </div>

          {list.length === 0 ? (
            <div className="empty-state" style={{ paddingTop: 48 }}>
              <span className="empty-icon">
                <Icon name="calendar" size={32} />
              </span>
              <div className="h3" style={{ marginTop: 16 }}>
                {tab === 'upcoming' ? 'No bookings yet' : 'No past bookings'}
              </div>
              <p className="muted" style={{ marginTop: 6, maxWidth: 260 }}>
                {tab === 'upcoming'
                  ? 'Book an idle private charger nearby. Your upcoming sessions will show up here.'
                  : 'Finished, declined and cancelled bookings show up here.'}
              </p>
              {tab === 'upcoming' && (
                <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={() => navigate('/app', { replace: true })}>
                  Find a charger
                </button>
              )}
            </div>
          ) : (
            <ul className="booking-list">
              {list.map((b) => {
                const spot = db.spots.find((s) => s.id === b.spotId)
                const badge = STATUS_BADGE[b.status]
                const action = bookingAction(b)
                const start = new Date(b.start)
                return (
                  <li key={b.id} className="booking-card" data-booking={b.id} data-status={b.status}>
                    <button className="booking-main" onClick={() => navigate(`/app/booking/${b.id}`)}>
                      {spot && <SpotPhoto spot={spot} className="spot-thumb" />}
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span className="spot-card-title">{spot?.title ?? 'Charger'}</span>
                        <span className="caption" style={{ display: 'block' }}>
                          {fmtDate(start)} · {hhmm(start)}–{hhmm(endOf(b))}
                        </span>
                        <span className={cx('badge', badge.tone)} style={{ marginTop: 6 }}>
                          {badge.label}
                        </span>
                      </span>
                    </button>
                    <button className={cx('btn sm block', action.primary ? 'btn-primary' : 'btn-secondary')} onClick={() => navigate(action.to)}>
                      {action.label}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
