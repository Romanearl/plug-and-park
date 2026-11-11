import { useState } from 'react'
import { BottomSheet } from '../../components/BottomSheet'
import { Icon, type IconName } from '../../components/Icon'
import { hk2, ownerBalance } from '../../lib/money'
import { navigate } from '../../lib/router'
import { signOut, useCurrentUser, useDB } from '../../lib/store'

export function Account() {
  const user = useCurrentUser()
  const db = useDB()
  const [sheet, setSheet] = useState<null | 'payment' | 'help'>(null)
  if (!user) return null

  const rows: { icon: IconName; label: string; value?: string }[] = [
    { icon: 'mail', label: 'Email', value: user.email },
    { icon: 'phone', label: 'Mobile', value: user.phone ?? 'Not added' },
    ...(user.role === 'driver' ? [{ icon: 'car' as IconName, label: 'Vehicle', value: user.vehicle ?? 'Not added' }] : []),
    ...(user.role === 'owner'
      ? [
          { icon: 'plug' as IconName, label: 'Spots', value: `${db.spots.filter((s) => s.ownerId === user.id).length} listed` },
          { icon: 'wallet' as IconName, label: 'Lifetime earnings (net)', value: hk2(ownerBalance(user.id, db).lifetimeNet) },
          { icon: 'card' as IconName, label: 'Payout method', value: user.payoutMethod?.label ?? 'Not set — add one when you withdraw' },
        ]
      : []),
  ]

  return (
    <div className="screen-view">
      <div className="scroll">
        <div className="page rise" style={{ paddingTop: 20, paddingBottom: 28 }}>
          <h1 className="h1">Account</h1>

          <div className="row" style={{ marginTop: 20, gap: 16 }}>
            <span className="avatar lg">{user.name.trim()[0]?.toUpperCase()}</span>
            <div style={{ minWidth: 0 }}>
              <div className="h2" style={{ overflowWrap: 'anywhere' }}>
                {user.name}
              </div>
              <div className="row" style={{ gap: 6, marginTop: 4 }}>
                <Icon name="star" size={16} fill="currentColor" stroke={0} />
                <span style={{ fontWeight: 600 }}>{user.ratingCount ? user.rating.toFixed(1) : 'New'}</span>
                <span className="caption">
                  {user.ratingCount ? `· ${user.ratingCount} ratings from ${user.role === 'owner' ? 'drivers' : 'owners'}` : '· no ratings yet'}
                </span>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 24 }}>
            {rows.map((r) => (
              <div key={r.label} className="list-row">
                <span className="list-icon">
                  <Icon name={r.icon} size={20} />
                </span>
                <div style={{ minWidth: 0 }}>
                  <div className="caption">{r.label}</div>
                  <div style={{ fontWeight: 600, overflowWrap: 'anywhere' }}>{r.value}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="overline muted" style={{ marginTop: 28 }}>
            Settings
          </div>
          <div style={{ marginTop: 4 }}>
            <button className="list-row list-button" onClick={() => setSheet('payment')}>
              <span className="list-icon">
                <Icon name="card" size={20} />
              </span>
              <span style={{ fontWeight: 600, flex: 1 }}>Payment methods</span>
              <Icon name="chevron" size={20} className="muted" />
            </button>
            <button className="list-row list-button" onClick={() => setSheet('help')}>
              <span className="list-icon">
                <Icon name="help" size={20} />
              </span>
              <span style={{ fontWeight: 600, flex: 1 }}>Help</span>
              <Icon name="chevron" size={20} className="muted" />
            </button>
          </div>

          <button
            className="btn btn-secondary block"
            style={{ marginTop: 28 }}
            onClick={() => {
              navigate('/', { replace: true })
              signOut()
            }}
          >
            Sign out
          </button>
        </div>
      </div>

      <BottomSheet
        open={sheet !== null}
        onClose={() => setSheet(null)}
        title={sheet === 'payment' ? 'Payment methods' : 'Help'}
        labelId="account-sheet-title"
      >
        <div className="banner info" style={{ marginTop: 4 }}>
          <Icon name="info" size={20} />
          <span>Demo only</span>
        </div>
        <p className="muted" style={{ marginTop: 12 }}>
          {sheet === 'payment'
            ? 'Cards are entered at checkout. This prototype never stores card numbers, only the last 4 digits of the demo card.'
            : 'In the real app this opens chat support. For the demo, tap the Demo strip at the top for test accounts and a reset.'}
        </p>
        <button className="btn btn-primary block" style={{ marginTop: 20 }} onClick={() => setSheet(null)}>
          Got it
        </button>
      </BottomSheet>
    </div>
  )
}
