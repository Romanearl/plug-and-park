// Placeholder for every route that isn't built yet.

import { Icon } from '../components/Icon'
import { back, navigate } from '../lib/router'
import { signOut, useCurrentUser } from '../lib/store'

export function ComingSoon({ title, session, checklist }: { title: string; session?: string; checklist: string[] }) {
  const user = useCurrentUser()
  const initials = user?.name
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
  return (
    <div className="screen-view">
      <div className="topbar">
        <button className="icon-btn" onClick={() => back('/')} aria-label="Back">
          <Icon name="back" />
        </button>
      </div>
      <div className="scroll">
        <div className="page rise" style={{ paddingBottom: 24 }}>
          {session && <span className="badge blue">Coming in {session}</span>}
          <h1 className="h1" style={{ marginTop: 12 }}>
            {title}
          </h1>

          {user && (
            <div className="card flat signed-in" style={{ marginTop: 20 }}>
              <span className="avatar">{initials}</span>
              <div>
                <div className="caption">Signed in as</div>
                <div style={{ fontWeight: 700 }}>{user.name}</div>
              </div>
              <span className="spacer" />
              <span className="badge">{user.role === 'owner' ? 'Owner' : 'Driver'}</span>
            </div>
          )}

          {checklist.length > 0 ? (
            <>
              <div className="overline muted" style={{ marginTop: 28 }}>
                What's coming
              </div>
              <ul className="checklist" style={{ marginTop: 6 }}>
                {checklist.map((item) => (
                  <li key={item}>
                    <span className="tick">
                      <Icon name="check" size={14} stroke={2.5} />
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="muted" style={{ marginTop: 12 }}>
              This page doesn't exist. Head back to the start.
            </p>
          )}
        </div>
      </div>
      <div className="bottom-bar stack" style={{ gap: 10 }}>
        <button className="btn btn-primary block" onClick={() => navigate('/')}>
          Back to start
        </button>
        {user && (
          <button className="btn btn-secondary block" onClick={() => signOut()}>
            Sign out
          </button>
        )}
      </div>
    </div>
  )
}
