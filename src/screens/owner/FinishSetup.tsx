// Finish setup (diagram 3: "Request access codes and payment information" → "Provide access code
// and payment information" → "Add charging spot to the platform").

import { useState } from 'react'
import { TextField } from '../../components/Field'
import { Icon } from '../../components/Icon'
import { SpotPhoto } from '../../components/SpotPhoto'
import { goLive } from '../../lib/applyActions'
import { setFlash } from '../../lib/flash'
import { validateAccountNumber, validateFpsId, validatePin } from '../../lib/money'
import { navigate } from '../../lib/router'
import { useCurrentUser, useDB } from '../../lib/store'
import { cx } from '../../lib/util'

const BANKS = ['Bank A', 'Bank B', 'Bank C']

export function FinishSetup({ id }: { id: string }) {
  const db = useDB()
  const user = useCurrentUser()
  const spot = db.spots.find((s) => s.id === id && s.ownerId === user?.id)
  const [pin, setPin] = useState('')
  const [instructions, setInstructions] = useState('')
  const [method, setMethod] = useState<'FPS' | 'Bank transfer'>(user?.payoutMethod?.type ?? 'FPS')
  const [fps, setFps] = useState(user?.phone ?? '')
  const [bank, setBank] = useState(BANKS[0])
  const [account, setAccount] = useState('')
  const [tried, setTried] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!user) return null
  if (!spot || spot.reviewStatus !== 'approved' || spot.active) {
    return (
      <div className="screen-view">
        <div className="empty-state" style={{ flex: 1 }}>
          <span className="empty-icon">
            <Icon name="plug" size={30} />
          </span>
          <div className="h3" style={{ marginTop: 14 }}>
            {spot?.active ? 'This charger is already live' : 'Nothing to set up here'}
          </div>
          <button className="btn btn-primary" style={{ marginTop: 18 }} onClick={() => navigate(spot?.active ? '/owner/spots' : '/owner', { replace: true })}>
            {spot?.active ? 'Your spots' : 'Back to home'}
          </button>
        </div>
      </div>
    )
  }

  const pinErr = validatePin(pin)
  const instrErr = instructions.trim().length < 5 ? 'Add short access instructions (5+ characters)' : null
  const payErr = method === 'FPS' ? validateFpsId(fps) : validateAccountNumber(account)

  const submit = () => {
    setTried(true)
    setError(null)
    if (pinErr || instrErr || payErr || busy) return
    setBusy(true)
    const last4 = (method === 'FPS' ? fps : account).replace(/\D/g, '').slice(-4)
    const label = method === 'FPS' ? (fps.includes('@') ? `FPS ${fps.trim().replace(/^(.).*(@.*)$/, '$1•••$2')}` : `FPS •••• ${last4}`) : `${bank} •••• ${last4}`
    window.setTimeout(() => {
      const r = goLive(spot.id, user.id, { pin, instructions, payoutMethod: { type: method, label } })
      setAccount('')
      if (r.ok) {
        setFlash('Your charger is live')
        navigate('/owner/spots', { replace: true })
      } else {
        setBusy(false)
        setError(r.reason)
      }
    }, 700)
  }

  return (
    <div className="screen-view">
      <div className="topbar">
        <button className="icon-btn" onClick={() => navigate('/owner', { replace: true })} aria-label="Back" disabled={busy}>
          <Icon name="back" />
        </button>
        <h1 className="h2" style={{ flex: 1 }}>
          Finish setup
        </h1>
      </div>
      <div className="scroll">
        <div className="page stack" style={{ gap: 18, paddingBottom: 24 }}>
          <div className="row" style={{ gap: 12 }}>
            <SpotPhoto spot={spot} className="spot-thumb" />
            <div style={{ minWidth: 0 }}>
              <span className="badge green">Approved</span>
              <div style={{ fontWeight: 700, marginTop: 4 }} className="clamp-2">
                {spot.title}
              </div>
            </div>
          </div>
          {error && (
            <div className="banner error" role="alert">
              <Icon name="info" size={20} /> {error}
            </div>
          )}
          <section className="stack" style={{ gap: 14 }}>
            <h2 className="h2">Access code</h2>
            <p className="caption" style={{ marginTop: -8 }}>
              Drivers get this only after they pay.
            </p>
            <TextField label="Gate PIN (4 digits)" value={pin} onChange={(v) => setPin(v.replace(/\D/g, '').slice(0, 4))} error={tried ? pinErr : null} inputMode="numeric" autoComplete="off" />
            <div className="field">
              <label htmlFor="setup-instr">Access instructions</label>
              <textarea id="setup-instr" className={cx('input textarea', tried && instrErr && 'invalid')} maxLength={200} value={instructions} onChange={(e) => setInstructions(e.target.value.slice(0, 200))} rows={3} placeholder="e.g. Blue gate on the left, bay with the charger" />
              {tried && instrErr ? <div className="field-error">{instrErr}</div> : <div className="field-hint" style={{ textAlign: 'right' }}>{instructions.length}/200</div>}
            </div>
          </section>
          <section className="stack" style={{ gap: 14 }}>
            <h2 className="h2">Payment information</h2>
            <p className="caption" style={{ marginTop: -8 }}>
              Where we send your earnings after each session.
            </p>
            <div className="role-grid" role="radiogroup" aria-label="Payout method">
              {(['FPS', 'Bank transfer'] as const).map((m) => (
                <button key={m} type="button" role="radio" aria-checked={method === m} className={cx('role-card compact', method === m && 'selected')} onClick={() => setMethod(m)}>
                  <span className="role-title">{m}</span>
                  <span className="role-sub">{m === 'FPS' ? 'Instant, 24/7' : '1 business day'}</span>
                </button>
              ))}
            </div>
            {method === 'FPS' ? (
              <TextField label="FPS ID (mobile or email)" value={fps} onChange={setFps} error={tried ? payErr : null} placeholder="9123 4567" />
            ) : (
              <>
                <div className="field">
                  <label htmlFor="setup-bank">Bank</label>
                  <select id="setup-bank" className="input" value={bank} onChange={(e) => setBank(e.target.value)}>
                    {BANKS.map((b) => (
                      <option key={b}>{b}</option>
                    ))}
                  </select>
                </div>
                <TextField label="Account number" value={account} onChange={(v) => setAccount(v.replace(/[^\d\s-]/g, '').slice(0, 16))} error={tried ? payErr : null} inputMode="numeric" autoComplete="off" hint="We only keep the last 4 digits." />
              </>
            )}
          </section>
        </div>
      </div>
      <div className="bottom-bar">
        <button className="btn btn-primary block" onClick={submit} disabled={busy} aria-busy={busy}>
          {busy ? (
            <>
              <span className="spinner" aria-hidden /> Going live…
            </>
          ) : (
            'Go live'
          )}
        </button>
      </div>
    </div>
  )
}
