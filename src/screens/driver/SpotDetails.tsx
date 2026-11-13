// Spot details (full screen, no tab bar): carousel, price, charger, amenities,
// availability, access, host, reviews and a sticky "Request booking" bar.

import { useRef, useState } from 'react'
import { Icon } from '../../components/Icon'
import { SpotPhoto } from '../../components/SpotPhoto'
import { BookingSheet } from './BookingSheet'
import type { Spot } from '../../data/types'
import { formatAvailability, openStatus } from '../../lib/availability'
import { estimateKwh, isDcFast, priceFor } from '../../lib/pricing'
import { back } from '../../lib/router'
import { useDB } from '../../lib/store'
import { cx, fmtDate, hkd, shortName } from '../../lib/util'

export function SpotDetails({ id }: { id: string }) {
  const db = useDB()
  const spot = db.spots.find((s) => s.id === id && s.active && s.reviewStatus === 'approved')
  const [bookingOpen, setBookingOpen] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const reviewsRef = useRef<HTMLElement>(null)

  if (!spot) {
    return (
      <div className="screen-view">
        <div className="topbar">
          <button className="icon-btn" onClick={() => back('/app')} aria-label="Back">
            <Icon name="back" />
          </button>
        </div>
        <div className="empty-state rise" style={{ flex: 1 }}>
          <span className="empty-icon">
            <Icon name="pin" size={32} />
          </span>
          <div className="h3" style={{ marginTop: 16 }}>
            This charger is no longer listed
          </div>
          <p className="muted" style={{ marginTop: 6 }}>
            The owner may have paused it. Plenty of others nearby.
          </p>
          <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={() => back('/app')}>
            Back to map
          </button>
        </div>
      </div>
    )
  }

  const now = new Date()
  const status = openStatus(spot, now)
  const owner = db.users.find((u) => u.id === spot.ownerId)
  const reviews = db.reviews
    .filter((r) => r.spotId === spot.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const shown = showAll ? reviews : reviews.slice(0, 3)
  const dc = isDcFast(spot)
  const lines = formatAvailability(spot)
  const today = now.getDay()

  return (
    <div className="screen-view">
      <div className="scroll">
        <Carousel spot={spot} />

        <div className="page rise" style={{ paddingTop: 18, paddingBottom: 32 }}>
          <h1 className="h1">{spot.title}</h1>
          <p className="muted" style={{ marginTop: 6 }}>
            {spot.district} · {spot.propertyType}
          </p>

          <div className="row" style={{ gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
            <button className="rating-link" onClick={() => reviewsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
              <Icon name="star" size={16} fill="currentColor" stroke={0} />
              <b>{spot.rating.toFixed(1)}</b>
              <span>({spot.reviewsCount} reviews)</span>
            </button>
            <span className={cx('badge', status.open ? 'green' : 'amber')}>{status.label}</span>
          </div>

          <div className="price-block">
            <div>
              <span className="price-big">{hkd(spot.pricePerHour)}</span>
              <span className="muted"> / hour</span>
            </div>
            <div className="caption" style={{ marginTop: 2 }}>
              15 min from {hkd(priceFor(spot, 15))}
            </div>
          </div>

          <section className="card flat detail-card">
            <div className="row" style={{ gap: 14 }}>
              <span className="list-icon blue">
                <Icon name="bolt" size={22} />
              </span>
              <div style={{ flex: 1 }}>
                <div className="h3">
                  {spot.chargerType} · {spot.powerKw} kW
                </div>
                <div className="caption">{dc ? 'DC fast charging' : 'AC charging'}</div>
              </div>
              <span className={cx('badge', dc ? 'blue' : '')}>{dc ? 'DC fast' : 'AC'}</span>
            </div>
            <p style={{ marginTop: 12, fontSize: 15 }}>
              Adds about <b>{estimateKwh(spot, 60)} kWh</b> in an hour <span className="caption">(estimate)</span>
            </p>
          </section>

          <Section title="Amenities">
            <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
              {spot.amenities.map((a) => (
                <span key={a} className="chip static">
                  {a}
                </span>
              ))}
            </div>
          </Section>

          <Section title="Availability">
            <ul className="avail-list">
              {lines.map((l) => (
                <li key={l.label} className={cx(l.days.includes(today) && 'today')}>
                  <Icon name="clock" size={18} />
                  <span>{l.label}</span>
                  {l.days.includes(today) && <span className="badge blue">Today</span>}
                </li>
              ))}
              {!lines.some((l) => l.days.includes(today)) && (
                <li className="closed-today">
                  <Icon name="clock" size={18} />
                  <span>Closed today</span>
                </li>
              )}
            </ul>
          </Section>

          <Section title="Access">
            <div className="row" style={{ gap: 14 }}>
              <span className="list-icon">
                <Icon name="key" size={20} />
              </span>
              <p style={{ fontSize: 15 }}>You get a QR code and a PIN after payment.</p>
            </div>
          </Section>

          <Section title="Hosted by">
            <div className="row" style={{ gap: 14 }}>
              <span className="avatar">{owner?.name.trim()[0] ?? '?'}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700 }}>{owner?.name ?? 'Private owner'}</div>
                <div className="caption">
                  {owner ? `★ ${owner.rating.toFixed(1)} host rating · ` : ''}Usually replies in minutes
                </div>
              </div>
            </div>
          </Section>

          <section ref={reviewsRef} className="detail-section" id="reviews">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <h2 className="h2">Reviews</h2>
              {spot.reviewsCount > 0 && (
                <span className="rating" style={{ fontSize: 15 }}>
                  <Icon name="star" size={16} fill="currentColor" stroke={0} />
                  <b>{spot.rating.toFixed(1)}</b>
                  <span className="caption">· {spot.reviewsCount} reviews</span>
                </span>
              )}
            </div>
            {reviews.length === 0 ? (
              <div className="card flat" style={{ marginTop: 12, textAlign: 'center' }}>
                <div style={{ fontWeight: 600 }}>{spot.reviewsCount > 0 ? 'No written reviews yet' : 'No reviews yet'}</div>
                <div className="caption" style={{ marginTop: 2 }}>
                  Drivers can leave a review after charging here.
                </div>
              </div>
            ) : (
              <ul className="review-list">
                {shown.map((r) => {
                  const author = db.users.find((u) => u.id === r.driverId)
                  return (
                    <li key={r.id}>
                      <div className="row" style={{ gap: 10 }}>
                        <span className="avatar sm">{author?.name.trim()[0] ?? 'D'}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600 }}>{author ? shortName(author.name) : 'Driver'}</div>
                          <div className="caption">{fmtDate(r.createdAt)}</div>
                        </div>
                        <Stars value={r.rating} />
                      </div>
                      <p style={{ marginTop: 8, fontSize: 15 }}>{r.text}</p>
                    </li>
                  )
                })}
              </ul>
            )}
            {reviews.length > 3 && !showAll && (
              <button className="btn btn-secondary block sm" style={{ marginTop: 12 }} onClick={() => setShowAll(true)}>
                Show all {reviews.length} reviews
              </button>
            )}
          </section>
        </div>
      </div>

      <div className="sticky-bar">
        <div>
          <div style={{ fontWeight: 800, fontSize: 20 }}>{hkd(spot.pricePerHour)}</div>
          <div className="caption">per hour</div>
        </div>
        <button className="btn btn-primary" style={{ flex: 1, maxWidth: 220 }} onClick={() => setBookingOpen(true)}>
          Request booking
        </button>
      </div>

      <BookingSheet spot={spot} open={bookingOpen} onClose={() => setBookingOpen(false)} />
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="detail-section">
      <h2 className="h2" style={{ marginBottom: 12 }}>
        {title}
      </h2>
      {children}
    </section>
  )
}

function Stars({ value }: { value: number }) {
  return (
    <span className="stars" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Icon key={i} name="star" size={14} stroke={0} fill={i <= value ? 'currentColor' : 'var(--line)'} />
      ))}
    </span>
  )
}

function Carousel({ spot }: { spot: Spot }) {
  const [index, setIndex] = useState(0)
  const track = useRef<HTMLDivElement>(null)
  const n = Math.max(1, spot.photoCount)
  return (
    <div className="carousel">
      <div
        ref={track}
        className="carousel-track"
        onScroll={(e) => {
          const el = e.currentTarget
          setIndex(Math.round(el.scrollLeft / el.clientWidth))
        }}
        aria-label="Photos"
      >
        {Array.from({ length: n }, (_, i) => (
          <SpotPhoto key={i} spot={spot} index={i} className="carousel-slide" />
        ))}
      </div>
      <button className="icon-btn on-photo carousel-back" onClick={() => back('/app')} aria-label="Back">
        <Icon name="back" />
      </button>
      <span className="carousel-count">
        {index + 1}/{n}
      </span>
      <div className="carousel-dots" aria-hidden>
        {Array.from({ length: n }, (_, i) => (
          <span key={i} className={cx(i === index && 'active')} />
        ))}
      </div>
    </div>
  )
}
