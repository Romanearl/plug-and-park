import { Icon } from '../../components/Icon'
import { navigate } from '../../lib/router'

/** S3: empty state only. S5 lists upcoming and past bookings. */
export function MyBookings() {
  return (
    <div className="screen-view">
      <div className="scroll">
        <div className="page rise" style={{ paddingTop: 20 }}>
          <h1 className="h1">Bookings</h1>
        </div>
        <div className="empty-state rise-2">
          <span className="empty-icon">
            <Icon name="calendar" size={32} />
          </span>
          <div className="h3" style={{ marginTop: 16 }}>
            No bookings yet
          </div>
          <p className="muted" style={{ marginTop: 6, maxWidth: 260 }}>
            Book an idle private charger nearby. Your upcoming and past sessions will show up here.
          </p>
          <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={() => navigate('/app', { replace: true })}>
            Find a charger
          </button>
        </div>
      </div>
    </div>
  )
}
