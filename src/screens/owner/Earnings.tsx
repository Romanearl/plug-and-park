// Owner → Earnings (diagram 2: escrow → bill minus 18% commission + 3% gateway fee → net payout).
// Every figure comes from src/lib/money.ts.

import { useEffect, useRef, useState } from 'react'
import { BottomSheet } from '../../components/BottomSheet'
import { TextField } from '../../components/Field'
import { Icon } from '../../components/Icon'
import type { Booking, Payout } from '../../data/types'
import { breakdown, hk2, netOf, ownerBalance, payoutStatus, validateAccountNumber, validateFpsId } from '../../lib/money'
import { requestPayout } from '../../lib/ownerActions'
import { useCurrentUser, useDB } from '../../lib/store'
import { cx, fmtDate, hkd } from '../../lib/util'

const BANKS = ['Bank A', 'Bank B', 'Bank C']
const DAY_LETTER = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const doneAt = (b: Booking) => new Date(b.completedAt ?? b.start)

export function Earnings() {
  const db = useDB()
  const user = useCurrentUser()
  const [open, setOpen] = useState<string | null>(null)
  const [withdrawing, setWithdrawing] = useState(false)
  const [now, setNow] = useState(Date.now())

  const payouts = user ? db.payouts.filter((p) => p.ownerId === user.id) : []
  const anyProcessing = payouts.some((p) => payoutStatus(p, now) === 'processing')
  useEffect(() => {
    if (!anyProcessing) return
    const t = window.setInterval(() => setNow(Date.now()), 500)
    return () => window.clearInterval(t)
  }, [anyProcessing])

  if (!user) return null
  const bal = ownerBalance(user.id, db)
  const mine = db.bookings.filter((b) => b.ownerId === user.id)
  const completed = mine.filter((b) => b.status === 'completed').sort((a, b) => doneAt(b).getTime() - doneAt(a).getTime())
  const pending = mine.filter((b) => b.status === 'paid' || b.status === 'active').sort((a, b) => a.start.localeCompare(b.start))

  // This week: net per day for the last 7 days (today last).
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - (6 - i))
    return d
  })
  const perDay = days.map((d) =>
    Math.round(completed.filter((b) => doneAt(b).toDateString() === d.toDateString()).reduce((s, b) => s + netOf(b), 0) * 100) / 100,
  )
  const weekTotal = Math.round(perDay.reduce((a, b) => a + b, 0) * 100) / 100
  const max = Math.max(...perDay, 1)
  const driverName = (id: string) => db.users.find((u) => u.id === id)?.name ?? 'Driver'
  const spotTitle = (id: string) => db.spots.find((s) => s.id === id)?.title ?? 'Charger'
  const empty = completed.length === 0 && pending.length === 0 && payouts.length === 0

  return (
    <div className="screen-view">
      <div className="scroll">
        <div className="page rise" style={{ paddingTop: 20, paddingBottom: 28 }}>
          <h1 className="h1">Earnings</h1>

          <section className="balance-card" aria-label="Balance">
            <div className="balance-label">Available to withdraw</div>
            <div className="balance-amount" data-available={bal.available}>
              <CountUp value={bal.available} />
            </div>
            <button className="btn btn-inverse block" style={{ marginTop: 14 }} onClick={() => setWithdrawing(true)}>
              Withdraw
            </button>
            <div className="balance-sub">
              <div>
                <span>Held until sessions end</span>
                <b data-escrow={bal.inEscrow}>{hk2(bal.inEscrow)}</b>
              </div>
              <div>
                <span>Paid out so far</span>
                <b data-paidout={bal.paidOut}>{hk2(bal.paidOut)}</b>
              </div>
            </div>
          </section>

          {empty ? (
            <div className="empty-state compact" style={{ paddingTop: 36 }}>
              <span className="empty-icon">
                <Icon name="wallet" size={30} />
              </span>
              <div className="h3" style={{ marginTop: 14 }}>
                No earnings yet — approve your first request
              </div>
              <p className="muted" style={{ marginTop: 4 }}>
                You keep 79% of every booking: 18% goes to Plug &amp; Park and 3% to payment processing.
              </p>
            </div>
          ) : (
            <>
              <section className="detail-section" aria-label="This week">
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <h2 className="h2">This week</h2>
                  <span style={{ fontWeight: 800 }}>{hk2(weekTotal)}</span>
                </div>
                <svg className="week-chart" viewBox="0 0 350 140" role="img" aria-label={`Net earnings this week: ${hk2(weekTotal)}`}>
                  {perDay.map((v, i) => {
                    const h = v > 0 ? Math.max(6, (v / max) * 96) : 3
                    const x = 10 + i * 48
                    const today = i === 6
                    return (
                      <g key={i}>
                        <rect x={x} y={110 - h} width="34" height={h} rx="6" fill={today ? 'var(--mint)' : 'var(--surface-2)'} stroke={today ? 'var(--mint-deep)' : 'none'} strokeWidth="1" />
                        {v > 0 && (
                          <text x={x + 17} y={104 - h} textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--ink)">
                            {Math.round(v)}
                          </text>
                        )}
                        <text x={x + 17} y="132" textAnchor="middle" fontSize="12" fontWeight={today ? 800 : 600} fill={today ? 'var(--ink)' : 'var(--muted)'}>
                          {DAY_LETTER[days[i].getDay()]}
                        </text>
                      </g>
                    )
                  })}
                </svg>
              </section>

              {pending.length > 0 && (
                <section className="detail-section">
                  <h2 className="h2">Pending</h2>
                  <ul className="tx-list">
                    {pending.map((b) => (
                      <li key={b.id} className="tx-row" data-booking={b.id}>
                        <div className="tx-main">
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 600 }}>{driverName(b.driverId)}</div>
                            <div className="caption">
                              {spotTitle(b.spotId)} · {fmtDate(b.start)}
                            </div>
                            <span className="badge amber" style={{ marginTop: 6 }}>
                              Released after the session
                            </span>
                          </div>
                          <b>{hk2(netOf(b))}</b>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <section className="detail-section">
                <h2 className="h2">Transactions</h2>
                {completed.length === 0 ? (
                  <p className="muted" style={{ marginTop: 8 }}>
                    Completed sessions show up here.
                  </p>
                ) : (
                  <ul className="tx-list">
                    {completed.map((b) => {
                      const br = breakdown(b.price, b.commissionRate)
                      const isOpen = open === b.id
                      return (
                        <li key={b.id} className={cx('tx-row', isOpen && 'open')} data-booking={b.id}>
                          <button className="tx-main" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : b.id)}>
                            <div style={{ minWidth: 0, textAlign: 'left' }}>
                              <div style={{ fontWeight: 600 }}>{driverName(b.driverId)}</div>
                              <div className="caption">
                                {spotTitle(b.spotId)} · {fmtDate(doneAt(b))}
                              </div>
                            </div>
                            <span className="row" style={{ gap: 6 }}>
                              <b className="money-in">{hk2(br.net)}</b>
                              <Icon name="chevron" size={18} className="tx-chevron" />
                            </span>
                          </button>
                          {isOpen && (
                            <dl className="breakdown">
                              <div>
                                <dt>Booking total</dt>
                                <dd>{hk2(br.gross)}</dd>
                              </div>
                              <div>
                                <dt>Plug &amp; Park fee ({Math.round(b.commissionRate * 100)}%)</dt>
                                <dd>−{hk2(br.commission)}</dd>
                              </div>
                              <div>
                                <dt>Payment processing (3%)</dt>
                                <dd>−{hk2(br.gatewayFee)}</dd>
                              </div>
                              <div className="total">
                                <dt>You receive</dt>
                                <dd>{hk2(br.net)}</dd>
                              </div>
                            </dl>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                )}
              </section>

              <section className="detail-section">
                <h2 className="h2">Payouts</h2>
                {payouts.length === 0 ? (
                  <p className="muted" style={{ marginTop: 8 }}>
                    Withdrawals to FPS or your bank show up here.
                  </p>
                ) : (
                  <ul className="tx-list">
                    {payouts.map((p) => {
                      const st = payoutStatus(p, now)
                      return (
                        <li key={p.id} className="tx-row" data-payout={p.id}>
                          <div className="tx-main">
                            <div>
                              <div style={{ fontWeight: 600 }}>{p.destination ?? p.method}</div>
                              <div className="caption">{fmtDate(p.createdAt)}</div>
                            </div>
                            <span className="row" style={{ gap: 8 }}>
                              <span className={cx('badge', st === 'paid' ? 'green' : 'amber')}>{st === 'paid' ? 'Paid' : 'Processing'}</span>
                              <b>{hk2(p.amount)}</b>
                            </span>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </section>
            </>
          )}
        </div>
      </div>
      <WithdrawSheet open={withdrawing} onClose={() => setWithdrawing(false)} available={bal.available} ownerId={user.id} phone={user.phone} preferred={user.payoutMethod?.type} />
    </div>
  )
}

function WithdrawSheet({ open, onClose, available, ownerId, phone, preferred }: { open: boolean; onClose: () => void; available: number; ownerId: string; phone?: string; preferred?: 'FPS' | 'Bank transfer' }) {
  const [method, setMethod] = useState<'FPS' | 'Bank transfer'>(preferred ?? 'FPS')
  const [fps, setFps] = useState(phone ?? '')
  const [bank, setBank] = useState(BANKS[0])
  const [account, setAccount] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<Payout | null>(null)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (open) {
      setDone(null)
      setError(null)
      setFps(phone ?? '')
      setAccount('')
    }
  }, [open, phone])

  const submit = () => {
    const err = method === 'FPS' ? validateFpsId(fps) : validateAccountNumber(account)
    setError(err)
    if (err) return
    const last4 = (method === 'FPS' ? fps.replace(/\D/g, '') : account.replace(/\D/g, '')).slice(-4)
    const destination = method === 'FPS' ? (fps.includes('@') ? `FPS ${fps.trim().replace(/^(.).*(@.*)$/, '$1•••$2')}` : `FPS •••• ${last4}`) : `${bank} •••• ${last4}`
    if (sending) return
    setSending(true)
    // Short "Sending…" state: the mock bank/FPS request.
    window.setTimeout(() => {
      const r = requestPayout(ownerId, method, destination)
      setSending(false)
      if (r.ok) {
        setAccount('') // never keep the full account number around
        setDone(r.value)
      } else setError(r.reason)
    }, 600)
  }

  return (
    <BottomSheet open={open} onClose={onClose} title={done ? 'Withdrawal requested' : 'Withdraw'} labelId="withdraw-title">
      {done ? (
        <div style={{ textAlign: 'center', padding: '8px 0 4px' }}>
          <span className="status-icon green pop" aria-hidden>
            <Icon name="check" size={30} stroke={3} />
          </span>
          <div className="h2" style={{ marginTop: 14 }}>
            {hk2(done.amount)} on its way
          </div>
          <p className="muted" style={{ marginTop: 4 }}>
            On its way — usually within minutes via {done.method === 'FPS' ? 'FPS' : 'bank transfer'}.
          </p>
          <button className="btn btn-primary block" style={{ marginTop: 20 }} onClick={onClose}>
            Done
          </button>
        </div>
      ) : (
        <>
          <div className="withdraw-amount">
            <div className="caption">Amount</div>
            <div className="price-big">{hk2(available)}</div>
            {available <= 0 && <div className="field-hint">Nothing to withdraw yet. Earnings become available after each session ends.</div>}
          </div>
          <div className="field-label" style={{ marginTop: 16 }}>
            Send to
          </div>
          <div className="role-grid" role="radiogroup" aria-label="Payout method" style={{ marginTop: 8 }}>
            {(['FPS', 'Bank transfer'] as const).map((m) => (
              <button key={m} type="button" role="radio" aria-checked={method === m} className={cx('role-card compact', method === m && 'selected')} onClick={() => { setMethod(m); setError(null) }}>
                <span className="role-icon">
                  <Icon name={m === 'FPS' ? 'phone' : 'wallet'} size={22} />
                </span>
                <span className="role-title">{m}</span>
                <span className="role-sub">{m === 'FPS' ? 'Instant, 24/7' : '1 business day'}</span>
              </button>
            ))}
          </div>
          <div style={{ marginTop: 16 }}>
            {method === 'FPS' ? (
              <TextField label="FPS ID (mobile or email)" value={fps} onChange={(v) => { setFps(v); setError(null) }} error={error} autoComplete="tel" placeholder="9123 4567" />
            ) : (
              <div className="stack" style={{ gap: 14 }}>
                <div className="field">
                  <label htmlFor="bank-select">Bank</label>
                  <select id="bank-select" className="input" value={bank} onChange={(e) => setBank(e.target.value)}>
                    {BANKS.map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>
                </div>
                <TextField
                  label="Account number"
                  value={account}
                  onChange={(v) => { setAccount(v.replace(/[^\d\s-]/g, '').slice(0, 16)); setError(null) }}
                  error={error}
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="9–12 digits"
                  hint="We only keep the last 4 digits."
                />
              </div>
            )}
          </div>
          <button className={cx('btn btn-primary block')} style={{ marginTop: 20 }} disabled={available <= 0 || sending} aria-busy={sending} onClick={submit}>
            {sending ? (
              <>
                <span className="spinner" aria-hidden /> Sending…
              </>
            ) : (
              `Withdraw ${hkd(available)}`
            )}
          </button>
        </>
      )}
    </BottomSheet>
  )
}

/** Animates the balance when it changes (~600 ms); jumps straight there with reduced motion. */
function CountUp({ value }: { value: number }) {
  const [shown, setShown] = useState(value)
  const from = useRef(value)
  useEffect(() => {
    const start = from.current
    from.current = value
    if (start === value || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setShown(value)
      return
    }
    const t0 = performance.now()
    let raf = 0
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / 600)
      const eased = 1 - Math.pow(1 - k, 3)
      setShown(Math.round((start + (value - start) * eased) * 100) / 100)
      if (k < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value])
  return <>{hk2(shown)}</>
}
