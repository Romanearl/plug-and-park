// The "Demo only" strip on every screen, and the Demo controls sheet it opens.

import { useCallback, useEffect, useState } from 'react'
import { DEMO_ACCOUNTS, DEMO_CARDS, DEMO_OTP, DEMO_PASSWORD } from '../data/seed'
import { navigate } from '../lib/router'
import { completeSession } from '../lib/bookingActions'
import { resetDemo, signIn, useCurrentUser, useDB } from '../lib/store'
import { BottomSheet } from './BottomSheet'
import { IN_IFRAME } from './PhoneFrame'
import { Icon } from './Icon'

export function DemoBanner() {
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])
  return (
    <>
      <button className="demo-banner" onClick={() => setOpen(true)} aria-haspopup="dialog">
        <span className="dot" aria-hidden>
          ●
        </span>
        Demo only — no real payments or emails · <u>Demo</u>
      </button>
      <DemoSheet open={open} onClose={close} />
    </>
  )
}

function DemoSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const user = useCurrentUser()
  const db = useDB()
  const active = user ? db.bookings.find((b) => b.driverId === user.id && b.status === 'active') : undefined
  const [confirmReset, setConfirmReset] = useState(false)

  useEffect(() => {
    if (!open) setConfirmReset(false)
  }, [open])

  const go = (userId: string, to: string) => {
    signIn(userId)
    onClose()
    navigate(to)
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Demo controls" labelId="demo-sheet-title">
      <div className="signed-in" style={{ marginBottom: 14 }}>
        <span className="list-icon">
          <Icon name="user" size={20} />
        </span>
        <div>
          <div style={{ fontWeight: 600 }}>{user ? `Signed in as ${user.name}` : 'Not signed in'}</div>
          <div className="caption">Demo data is stored only in this browser.</div>
        </div>
      </div>

      <div className="card flat" style={{ padding: '10px 16px' }}>
        <div className="overline muted" style={{ padding: '4px 0 6px' }}>
          Demo credentials
        </div>
        <dl style={{ margin: 0 }}>
          <div className="cred-row">
            <dt>Driver login</dt>
            <dd>{DEMO_ACCOUNTS.driver.email}</dd>
          </div>
          <div className="cred-row">
            <dt>Owner login</dt>
            <dd>{DEMO_ACCOUNTS.owner.email}</dd>
          </div>
          <div className="cred-row">
            <dt>Password</dt>
            <dd>{DEMO_PASSWORD}</dd>
          </div>
          <div className="cred-row">
            <dt>Verification code</dt>
            <dd>{DEMO_OTP}</dd>
          </div>
          <div className="cred-row">
            <dt>Test card</dt>
            <dd>{DEMO_CARDS.success}</dd>
          </div>
          <div className="cred-row">
            <dt>Declined card</dt>
            <dd>{DEMO_CARDS.decline}</dd>
          </div>
        </dl>
      </div>

      <div className="stack" style={{ marginTop: 16, gap: 10 }}>
        {active && (
          <button
            className="btn btn-accent block"
            onClick={() => {
              completeSession(active.id, { skipToEnd: true })
              onClose()
              navigate(`/app/session/${active.id}`, { replace: true })
            }}
          >
            <Icon name="bolt" size={20} /> Skip charging to the end
          </button>
        )}
        <button className="btn btn-primary block" onClick={() => go(DEMO_ACCOUNTS.driver.userId, '/app')}>
          <Icon name="car" size={20} /> Sign in as driver
        </button>
        <button className="btn btn-accent block" onClick={() => go(DEMO_ACCOUNTS.owner.userId, '/owner')}>
          <Icon name="plug" size={20} /> Sign in as charger owner
        </button>
        {!IN_IFRAME && window.innerWidth >= 520 && (
          <button
            className="btn btn-ghost block"
            onClick={() => {
              onClose()
              navigate('/presenter')
            }}
          >
            <Icon name="map" size={20} /> Open presenter view (two phones)
          </button>
        )}
        {confirmReset ? (
          <button
            className="btn btn-danger block"
            onClick={() => {
              onClose()
              resetDemo()
            }}
          >
            Tap again to wipe all demo data
          </button>
        ) : (
          <button className="btn btn-secondary block" onClick={() => setConfirmReset(true)}>
            <Icon name="refresh" size={20} /> Reset demo
          </button>
        )}
      </div>
    </BottomSheet>
  )
}
