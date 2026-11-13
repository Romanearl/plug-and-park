// Payment (diagram 1: "Payment gateway processes payment" → successful? Yes / No).
// The card details live only in this component's state; only the last 4 digits are stored.

import { useEffect, useRef, useState } from 'react'
import { TextField } from '../../components/Field'
import { Icon } from '../../components/Icon'
import { SpotPhoto } from '../../components/SpotPhoto'
import { endOf, fmtDuration, hhmm } from '../../lib/booking'
import { payBooking } from '../../lib/bookingActions'
import {
  cardBrand,
  digitsOnly,
  formatCardNumber,
  formatExpiry,
  mockGateway,
  testExpiry,
  validateCardName,
  validateCardNumber,
  validateCvc,
  validateExpiry,
} from '../../lib/payment'
import { navigate } from '../../lib/router'
import { useCurrentUser, useDB } from '../../lib/store'
import { useForm } from '../../lib/useForm'
import { cx, fmtDate, hkd } from '../../lib/util'

export function Payment({ id }: { id: string }) {
  const db = useDB()
  const user = useCurrentUser()
  const b = db.bookings.find((x) => x.id === id && x.driverId === user?.id)
  const spot = b && db.spots.find((s) => s.id === b.spotId)
  const [processing, setProcessing] = useState(false)
  const [declined, setDeclined] = useState<string | null>(null)
  const alive = useRef(true)
  useEffect(() => {
    alive.current = true // React's dev-mode double mount runs the cleanup once before the screen is really shown
    return () => void (alive.current = false)
  }, [])

  const f = useForm(
    { number: '', expiry: '', cvc: '', name: '' },
    { number: validateCardNumber, expiry: (v) => validateExpiry(v), cvc: validateCvc, name: validateCardName },
  )

  // Only an approved (confirmed) booking of this driver can be paid; anything else → its status screen.
  const payable = !!b && b.status === 'confirmed'
  useEffect(() => {
    if (!payable && !processing) navigate(b ? `/app/booking/${b.id}` : '/app/bookings', { replace: true })
  }, [payable, processing, b])
  if (!b || !spot || (!payable && !processing)) return null

  const { values: v, error } = f
  const brand = cardBrand(v.number)

  const submit = async () => {
    setDeclined(null)
    if (!f.submitAll() || processing) return
    setProcessing(true)
    const res = await mockGateway(v.number)
    if (!alive.current) return
    if (!res.ok) {
      setProcessing(false)
      setDeclined(res.reason)
      f.fill({ number: '', expiry: '', cvc: '', name: v.name }) // keep only the name
      return
    }
    const r = payBooking(b.id, b.driverId, digitsOnly(v.number).slice(-4))
    f.fill({ number: '', expiry: '', cvc: '', name: '' })
    if (r.ok) navigate(`/app/confirm/${b.id}`, { replace: true })
    else {
      setProcessing(false)
      setDeclined(r.reason)
    }
  }

  const start = new Date(b.start)
  return (
    <div className="screen-view">
      <div className="topbar">
        <button className="icon-btn" onClick={() => navigate(`/app/booking/${b.id}`, { replace: true })} aria-label="Back" disabled={processing}>
          <Icon name="back" />
        </button>
      </div>
      <div className="scroll">
        <form
          id="pay-form"
          className="page stack"
          style={{ gap: 18, paddingBottom: 28 }}
          noValidate
          onSubmit={(e) => {
            e.preventDefault()
            void submit()
          }}
        >
          <h1 className="h1">Payment</h1>
          <section className="card flat">
            <div className="row" style={{ gap: 12 }}>
              <SpotPhoto spot={spot} className="spot-thumb" />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700 }}>{spot.title}</div>
                <div className="caption">
                  {fmtDate(start)} · {hhmm(start)}–{hhmm(endOf(b))} · {fmtDuration(b.durationMinutes)}
                </div>
              </div>
            </div>
            <div className="receipt">
              <div>
                <span>Charging bay</span>
                <span>HK${b.price.toFixed(2)}</span>
              </div>
              <div className="total">
                <span>Total</span>
                <span>{hkd(b.price)}</span>
              </div>
            </div>
            <p className="caption" style={{ marginTop: 8 }}>
              Held securely by Plug &amp; Park and released to the owner after your session.
            </p>
          </section>

          {declined && (
            <div className="banner error" role="alert">
              <Icon name="info" size={20} /> {declined}
            </div>
          )}

          <fieldset className="stack" style={{ gap: 18, border: 0, padding: 0, margin: 0 }} disabled={processing}>
            <TextField
              label="Card number"
              value={v.number}
              onChange={(x) => f.set('number', formatCardNumber(x))}
              onBlur={() => f.blur('number')}
              error={error.number}
              inputMode="numeric"
              autoComplete="cc-number"
              placeholder="1234 5678 9012 3456"
              suffix={brand !== 'unknown' ? <span className={cx('card-brand', brand)}>{brand === 'visa' ? 'VISA' : 'Mastercard'}</span> : undefined}
            />
            <div className="row" style={{ gap: 12, alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <TextField
                  label="Expiry"
                  value={v.expiry}
                  onChange={(x) => f.set('expiry', formatExpiry(x))}
                  onBlur={() => f.blur('expiry')}
                  error={error.expiry}
                  inputMode="numeric"
                  autoComplete="cc-exp"
                  placeholder="MM/YY"
                />
              </div>
              <div style={{ flex: 1 }}>
                <TextField
                  label="CVC"
                  value={v.cvc}
                  onChange={(x) => f.set('cvc', digitsOnly(x).slice(0, 3))}
                  onBlur={() => f.blur('cvc')}
                  error={error.cvc}
                  inputMode="numeric"
                  autoComplete="cc-csc"
                  placeholder="123"
                />
              </div>
            </div>
            <TextField
              label="Name on card"
              value={v.name}
              onChange={(x) => f.set('name', x)}
              onBlur={() => f.blur('name')}
              error={error.name}
              autoComplete="cc-name"
              autoCapitalize="words"
              placeholder="Chan Tai Man"
            />
            {/* Demo shortcuts: one tap fills the success card or the declined card (RF-6). */}
            <div className="row" style={{ gap: 10 }}>
              <button
                type="button"
                className="btn btn-secondary sm"
                style={{ flex: 1, minHeight: 44, paddingInline: 10 }}
                onClick={() => {
                  setDeclined(null)
                  f.fill({ number: '4242 4242 4242 4242', expiry: testExpiry(), cvc: '123', name: user?.name ?? '' })
                }}
              >
                <Icon name="card" size={18} /> Use test card
              </button>
              <button
                type="button"
                className="btn btn-secondary sm"
                style={{ flex: 1, minHeight: 44, paddingInline: 10 }}
                onClick={() => {
                  setDeclined(null)
                  f.fill({ number: '4000 0000 0000 0002', expiry: testExpiry(), cvc: '123', name: user?.name ?? '' })
                }}
              >
                Use declined card
              </button>
            </div>
          </fieldset>

          <p className="caption row" style={{ gap: 8 }}>
            <Icon name="lock" size={16} /> Demo only — no real payment is taken. Never enter a real card.
          </p>

        </form>
      </div>
      {/* The primary action stays in thumb reach, outside the scrolling form. */}
      <div className="bottom-bar">
         <button type="submit" form="pay-form" className={cx('btn btn-primary block', !f.valid && !processing && 'is-disabled')} aria-disabled={!f.valid} disabled={processing}>
           {processing ? (
             <>
               <span className="spinner" aria-hidden /> Processing…
             </>
           ) : (
             `Pay ${hkd(b.price)}`
           )}
         </button>
      </div>
    </div>
  )
}
