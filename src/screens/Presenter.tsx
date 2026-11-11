// Presenter view: two phones side by side (driver + owner) for the projector.
// Each phone is an <iframe> of the app with its own window.name, so the store keeps
// two separate logins; the shared localStorage + `storage` events sync them live.

import { useEffect, useState } from 'react'
import { Wordmark } from '../components/Wordmark'
import { DEMO_ACCOUNTS } from '../data/seed'
import { navigate } from '../lib/router'
import { reseedDemo } from '../lib/store'

const DEVICE_W = 414
const DEVICE_H = 868
const GAP = 72
const CHROME = 150 // labels above + controls below

function presetSessions(force = false) {
  try {
    // sessionStorage is shared by same-origin frames in one tab: set the frames' logins up front.
    if (force || !sessionStorage.getItem('pp.session.driver')) sessionStorage.setItem('pp.session.driver', DEMO_ACCOUNTS.driver.userId)
    if (force || !sessionStorage.getItem('pp.session.owner')) sessionStorage.setItem('pp.session.owner', DEMO_ACCOUNTS.owner.userId)
  } catch {
    /* storage blocked: the frames fall back to the landing page */
  }
}

function useViewport() {
  const [vp, setVp] = useState({ w: window.innerWidth, h: window.innerHeight })
  useEffect(() => {
    const on = () => setVp({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])
  return vp
}

export function Presenter() {
  const { w, h } = useViewport()
  const [ready] = useState(() => {
    presetSessions()
    return true
  })
  const [reloadKey, setReloadKey] = useState(0)

  if (w < 900) {
    return (
      <div className="presenter small">
        <Wordmark size="md" />
        <p style={{ marginTop: 20, fontSize: 18, fontWeight: 600 }}>The presenter view needs a laptop-size screen.</p>
        <button className="btn btn-inverse" style={{ marginTop: 20 }} onClick={() => navigate('/')}>
          Back to the app
        </button>
      </div>
    )
  }

  const s = Math.min(1, (h - CHROME) / DEVICE_H, (w - 80) / (2 * DEVICE_W + GAP))
  const base = `${window.location.pathname}${window.location.search}`
  const phones = [
    { name: 'driver', label: 'EV driver', src: `${base}#/app` },
    { name: 'owner', label: 'Charger owner', src: `${base}#/owner` },
  ]

  return (
    <div className="presenter">
      <div className="presenter-row" style={{ gap: GAP * s }}>
        {phones.map((p) => (
          <figure key={p.name} className="presenter-phone">
            <figcaption>{p.label}</figcaption>
            <div className="device-box" style={{ width: DEVICE_W * s, height: DEVICE_H * s }}>
              <div className="device" style={{ transform: `scale(${s})` }}>
                <div className="screen presenter-screen">
                  {ready && <iframe key={`${p.name}-${reloadKey}`} name={p.name} title={`${p.label} phone`} src={p.src} />}
                </div>
              </div>
            </div>
          </figure>
        ))}
      </div>
      <div className="presenter-controls">
        <button
          className="btn btn-ghost-light sm"
          onClick={() => {
            reseedDemo()
            presetSessions(true)
            setReloadKey((k) => k + 1)
          }}
        >
          Reset demo
        </button>
        <button className="btn btn-ghost-light sm" onClick={() => navigate('/')}>
          Single phone
        </button>
      </div>
    </div>
  )
}
