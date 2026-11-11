// Unknown route (any hash that no screen matches).

import { Icon } from '../components/Icon'
import { back, navigate } from '../lib/router'

export function NotFound() {
  return (
    <div className="screen-view">
      <div className="topbar">
        <button className="icon-btn" onClick={() => back('/')} aria-label="Back">
          <Icon name="back" />
        </button>
      </div>
      <div className="empty-state" style={{ flex: 1 }}>
        <span className="empty-icon">
          <Icon name="map" size={30} />
        </span>
        <h1 className="h2" style={{ marginTop: 16 }}>
          Page not found
        </h1>
        <p className="muted" style={{ marginTop: 6 }}>
          This page doesn't exist. Head back to the start.
        </p>
        <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={() => navigate('/', { replace: true })}>
          Back to start
        </button>
      </div>
    </div>
  )
}
