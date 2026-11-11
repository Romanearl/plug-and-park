// Rate & review (diagram 1: "Rate and review charging spot").

import { useEffect, useState } from 'react'
import { Icon } from '../../components/Icon'
import { SpotPhoto } from '../../components/SpotPhoto'
import { REVIEW_TAGS, submitReview } from '../../lib/bookingActions'
import { navigate } from '../../lib/router'
import { useCurrentUser, useDB } from '../../lib/store'
import { cx } from '../../lib/util'

const MAX = 300

export function Rate({ id }: { id: string }) {
  const db = useDB()
  const user = useCurrentUser()
  const b = db.bookings.find((x) => x.id === id && x.driverId === user?.id)
  const spot = b && db.spots.find((s) => s.id === b.spotId)
  const [stars, setStars] = useState(0)
  const [tags, setTags] = useState<string[]>([])
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const target = !b ? '/app/bookings' : b.status !== 'completed' ? `/app/booking/${b.id}` : b.reviewed && !done ? `/app/booking/${b.id}` : null
  useEffect(() => {
    if (target) navigate(target, { replace: true })
  }, [target])
  if (!b || !spot || target) return null

  if (done) {
    return (
      <div className="screen-view">
        <div className="empty-state" style={{ flex: 1 }}>
          <span className="status-icon green pop" style={{ width: 72, height: 72 }} aria-hidden>
            <Icon name="star" size={34} fill="currentColor" stroke={0} />
          </span>
          <h1 className="h1" style={{ marginTop: 18 }}>
            Thanks for your review!
          </h1>
          <p className="muted" style={{ marginTop: 6, maxWidth: 280 }}>
            It helps other drivers find great chargers, and helps owners improve their bays.
          </p>
          <button className="btn btn-primary" style={{ marginTop: 22 }} onClick={() => navigate('/app', { replace: true })}>
            Back to map
          </button>
        </div>
      </div>
    )
  }

  const submit = () => {
    if (!stars) return setError('Tap the stars to rate your charge')
    const r = submitReview({ bookingId: b.id, driverId: b.driverId, rating: stars, tags, text })
    if (r.ok) setDone(true)
    else setError(r.reason)
  }

  return (
    <div className="screen-view">
      <div className="topbar">
        <button className="icon-btn" onClick={() => navigate('/app/bookings', { replace: true })} aria-label="Close">
          <Icon name="close" />
        </button>
      </div>
      <div className="scroll">
        <div className="page" style={{ paddingBottom: 24 }}>
          <div className="row" style={{ gap: 12 }}>
            <SpotPhoto spot={spot} className="spot-thumb" />
            <div style={{ fontWeight: 700, minWidth: 0 }}>{spot.title}</div>
          </div>
          <h1 className="h1" style={{ marginTop: 22 }}>
            How was your charge?
          </h1>
          <div className="star-input" role="radiogroup" aria-label="Rating">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                role="radio"
                aria-checked={stars === n}
                aria-label={`${n} star${n > 1 ? 's' : ''}`}
                className={cx(n <= stars && 'on')}
                onClick={() => {
                  setStars(n)
                  setError(null)
                }}
              >
                <Icon name="star" size={40} stroke={1.5} fill={n <= stars ? 'currentColor' : 'none'} />
              </button>
            ))}
          </div>
          {error && (
            <div className="field-error" role="alert" style={{ marginTop: 6 }}>
              {error}
            </div>
          )}

          <div className="field-label" style={{ marginTop: 22 }}>
            What went well?
          </div>
          <div className="row" style={{ gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
            {REVIEW_TAGS.map((t) => {
              const on = tags.includes(t)
              return (
                <button key={t} className={cx('chip', on && 'active')} aria-pressed={on} onClick={() => setTags((s) => (on ? s.filter((x) => x !== t) : [...s, t]))}>
                  {t}
                </button>
              )
            })}
          </div>

          <div className="field" style={{ marginTop: 22 }}>
            <label htmlFor="review-text">Tell other drivers more (optional)</label>
            <textarea
              id="review-text"
              className="input textarea"
              value={text}
              maxLength={MAX}
              onChange={(e) => setText(e.target.value.slice(0, MAX))}
              placeholder="Easy access, fast charger…"
              rows={4}
            />
            <div className="field-hint" style={{ textAlign: 'right' }}>
              {text.length}/{MAX}
            </div>
          </div>
        </div>
      </div>
      <div className="bottom-bar stack" style={{ gap: 8 }}>
        <button className={cx('btn btn-primary block', !stars && 'is-disabled')} aria-disabled={!stars} onClick={submit}>
          Submit review
        </button>
        <button className="btn btn-ghost block" onClick={() => navigate('/app/bookings', { replace: true })}>
          Skip for now
        </button>
      </div>
    </div>
  )
}
