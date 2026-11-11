// Owner → My spots: list with an active switch (off = hidden from drivers, live).

import { Icon } from '../../components/Icon'
import { SpotPhoto } from '../../components/SpotPhoto'
import { setSpotActive } from '../../lib/ownerActions'
import { navigate } from '../../lib/router'
import { useCurrentUser, useDB } from '../../lib/store'
import { hkd } from '../../lib/util'

export function MySpots() {
  const db = useDB()
  const user = useCurrentUser()
  if (!user) return null
  const spots = db.spots.filter((s) => s.ownerId === user.id)
  return (
    <div className="screen-view">
      <div className="scroll">
        <div className="page rise" style={{ paddingTop: 20, paddingBottom: 28 }}>
          <h1 className="h1">Your spots</h1>
          <p className="muted" style={{ marginTop: 4 }}>
            {spots.filter((s) => s.active).length} of {spots.length} listed on the map
          </p>
          {spots.length === 0 ? (
            <div className="empty-state compact">
              <span className="empty-icon">
                <Icon name="plug" size={30} />
              </span>
              <div className="h3" style={{ marginTop: 14 }}>
                No spots yet
              </div>
              <p className="muted" style={{ marginTop: 4 }}>
                List your idle charging bay and start earning.
              </p>
            </div>
          ) : (
            <ul className="spot-list" style={{ marginTop: 12 }}>
              {spots.map((s) => (
                <li key={s.id} className="owner-spot" data-spot={s.id}>
                  <button className="owner-spot-main" onClick={() => navigate(`/owner/spots/${s.id}`)}>
                    <SpotPhoto spot={s} className="spot-thumb" />
                    <span className="spot-card-body">
                      <span className="spot-card-title">{s.title}</span>
                      <span className="caption">
                        {s.district} · {hkd(s.pricePerHour)}/h · ★ {s.rating.toFixed(1)}
                      </span>
                      {!s.active && <span className="badge" style={{ marginTop: 4 }}>Hidden from drivers</span>}
                    </span>
                  </button>
                  <label className="switch" aria-label={`${s.title} listed`}>
                    <input type="checkbox" role="switch" checked={s.active} onChange={(e) => setSpotActive(s.id, user.id, e.target.checked)} />
                    <span className="switch-track" aria-hidden />
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
