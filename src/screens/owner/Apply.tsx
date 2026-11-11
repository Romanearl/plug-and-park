// Owner application (diagram 3: "Fill in application … with charging spot photos and information").
// Three steps, draft saved on every change (survives a reload). Loaded lazily (uses Leaflet).

import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet'
import { Checkbox, TextField } from '../../components/Field'
import { Icon } from '../../components/Icon'
import { daysFromRows, rowsFromDays, ScheduleEditor } from '../../components/ScheduleEditor'
import { SpotPhoto } from '../../components/SpotPhoto'
import type { ChargerType, District } from '../../data/types'
import {
  AMENITIES,
  draftFromSpot,
  emptyDraft,
  loadDraft,
  POWER_OPTIONS,
  PROPERTY_TYPES,
  saveDraft,
  submitApplication,
  validateStep,
  type ApplicationDraft,
  type StepErrors,
} from '../../lib/applyActions'
import { breakdown, hk2 } from '../../lib/money'
import { navigate } from '../../lib/router'
import { CHARGER_TYPES, DISTRICT_CENTRES, DISTRICTS, districtPriceRange } from '../../lib/spots'
import { useCurrentUser, useDB } from '../../lib/store'
import { cx, hkd } from '../../lib/util'

const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
const MAX_PHOTO_BYTES = 120_000

export default function Apply({ spotId }: { spotId?: string }) {
  const user = useCurrentUser()
  const db = useDB()
  const [d, setD] = useState<ApplicationDraft>(() => {
    const saved = loadDraft()
    if (spotId) {
      if (saved?.spotId === spotId) return saved
      const s = db.spots.find((x) => x.id === spotId && x.ownerId === user?.id)
      return s ? draftFromSpot(s) : emptyDraft()
    }
    return saved && !saved.spotId ? saved : emptyDraft()
  })
  const [errors, setErrors] = useState<StepErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    if (!done) saveDraft(d)
  }, [d, done])

  const set = (patch: Partial<ApplicationDraft>) => {
    setD((x) => ({ ...x, ...patch }))
    setErrors((e) => {
      const n = { ...e }
      for (const k of Object.keys(patch)) delete n[k as keyof StepErrors]
      return n
    })
  }

  if (!user) return null

  const next = () => {
    const e = validateStep(d, d.step)
    setErrors(e)
    if (Object.keys(e).length) return
    if (d.step < 3) {
      set({ step: (d.step + 1) as 2 | 3 })
      document.querySelector('.apply .scroll')?.scrollTo({ top: 0 })
      return
    }
    if (submitting) return
    setSubmitting(true)
    window.setTimeout(() => {
      const r = submitApplication(user.id, d)
      setSubmitting(false)
      if (r.ok) {
        saveDraft(null)
        setDone(true)
      } else setNotice(r.reason)
    }, 900)
  }
  const back = () => (d.step === 1 ? navigate('/owner', { replace: true }) : set({ step: (d.step - 1) as 1 | 2 }))

  if (done) return <Received resubmitted={!!d.spotId} />

  const range = d.district ? districtPriceRange(db.spots, d.district) : null
  const net = breakdown(d.pricePerHour).net

  return (
    <div className="screen-view apply">
      <div className="topbar">
        <button className="icon-btn" onClick={back} aria-label="Back" disabled={submitting}>
          <Icon name="back" />
        </button>
        <div style={{ flex: 1 }}>
          <div className="caption" style={{ fontWeight: 600 }}>
            Step {d.step} of 3
          </div>
          <div className="progress" role="progressbar" aria-valuemin={1} aria-valuemax={3} aria-valuenow={d.step} aria-label={`Step ${d.step} of 3`}>
            <span style={{ width: `${(d.step / 3) * 100}%` }} />
          </div>
        </div>
      </div>
      <div className="scroll">
        <div className="page stack" style={{ gap: 18, paddingBottom: 24 }}>
          {d.spotId && <div className="banner info">Editing your application — fix the note from Plug &amp; Park and resubmit.</div>}
          {notice && (
            <div className="banner error" role="alert">
              <Icon name="info" size={20} /> {notice}
            </div>
          )}

          {d.step === 1 && (
            <>
              <h1 className="h1">Your bay</h1>
              <TextField label="Title" value={d.title} onChange={(v) => set({ title: v })} error={errors.title} placeholder="e.g. Village house garage — Pak Tam" maxLength={60} />
              <TextField label="Address" value={d.address} onChange={(v) => set({ address: v })} error={errors.address} placeholder="Street, area" autoComplete="street-address" maxLength={120} />
              <div className="field">
                <label htmlFor="district">District</label>
                <select
                  id="district"
                  className={cx('input', errors.district && 'invalid')}
                  value={d.district}
                  onChange={(e) => {
                    const dist = e.target.value as District
                    const c = DISTRICT_CENTRES[dist]
                    set({ district: dist, lat: c[0], lng: c[1] })
                  }}
                >
                  <option value="">Choose a district</option>
                  {DISTRICTS.map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
                {errors.district && <div className="field-error">{errors.district}</div>}
              </div>
              <Group label="Property type" error={errors.propertyType}>
                <div className="role-grid" role="radiogroup" aria-label="Property type">
                  {PROPERTY_TYPES.map((p) => (
                    <button key={p} type="button" role="radio" aria-checked={d.propertyType === p} className={cx('role-card compact tight', d.propertyType === p && 'selected')} onClick={() => set({ propertyType: p })}>
                      <span className="role-title">{p}</span>
                    </button>
                  ))}
                </div>
              </Group>
              <Group label="Location" error={errors.lat}>
                {d.district && d.lat != null && d.lng != null ? (
                  <>
                    <LocationPicker lat={d.lat} lng={d.lng} district={d.district} onMove={(lat, lng) => set({ lat, lng })} />
                    <p className="caption" style={{ marginTop: 6 }}>
                      Drag the pin to your bay.
                    </p>
                  </>
                ) : (
                  <div className="map-placeholder">Choose a district to place your pin</div>
                )}
              </Group>
            </>
          )}

          {d.step === 2 && (
            <>
              <h1 className="h1">Your charger</h1>
              <Group label="Connector type" error={errors.chargerType}>
                <div className="row" role="radiogroup" aria-label="Connector type" style={{ gap: 8, flexWrap: 'wrap' }}>
                  {CHARGER_TYPES.map((c) => (
                    <button key={c} type="button" role="radio" aria-checked={d.chargerType === c} className={cx('chip', d.chargerType === c && 'active')} onClick={() => set({ chargerType: c as ChargerType })}>
                      {c}
                    </button>
                  ))}
                </div>
              </Group>
              <div className="field">
                <label htmlFor="power">Power</label>
                <select id="power" className="input" value={d.powerKw} onChange={(e) => set({ powerKw: +e.target.value })}>
                  {POWER_OPTIONS.map((p) => (
                    <option key={p} value={p}>
                      {p} kW {p >= 40 ? '(DC fast)' : '(AC)'}
                    </option>
                  ))}
                </select>
              </div>
              <Group label="Price per hour">
                <div className="stepper-row">
                  <button type="button" className="icon-btn filled" aria-label="Lower price" disabled={d.pricePerHour <= 20} onClick={() => set({ pricePerHour: d.pricePerHour - 1 })}>
                    <span style={{ fontSize: 24, fontWeight: 700 }}>−</span>
                  </button>
                  <div className="price-big">{hkd(d.pricePerHour)}</div>
                  <button type="button" className="icon-btn filled" aria-label="Raise price" disabled={d.pricePerHour >= 35} onClick={() => set({ pricePerHour: d.pricePerHour + 1 })}>
                    <span style={{ fontSize: 24, fontWeight: 700 }}>+</span>
                  </button>
                </div>
                <input type="range" className="range" min={20} max={35} step={1} value={d.pricePerHour} onChange={(e) => set({ pricePerHour: +e.target.value })} aria-label="Price per hour" />
                <p className="caption" style={{ marginTop: 6 }}>
                  Drivers pay {hkd(d.pricePerHour)}/hour · you receive about {hk2(net)}
                </p>
                {range && d.district && (
                  <p className="caption" style={{ marginTop: 2 }}>
                    <Icon name="info" size={14} style={{ display: 'inline', verticalAlign: '-2px' }} /> Similar bays in {d.district} charge HK${range[0]}
                    {range[1] !== range[0] ? `–${range[1]}` : ''}
                  </p>
                )}
              </Group>
              <Group label="Amenities">
                <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                  {AMENITIES.map((a) => {
                    const on = d.amenities.includes(a)
                    return (
                      <button key={a} type="button" className={cx('chip', on && 'active')} aria-pressed={on} onClick={() => set({ amenities: on ? d.amenities.filter((x) => x !== a) : [...d.amenities, a] })}>
                        {a}
                      </button>
                    )
                  })}
                </div>
              </Group>
            </>
          )}

          {d.step === 3 && (
            <>
              <h1 className="h1">Photos and hours</h1>
              <Group label="Photos" error={errors.photos}>
                <div className="photo-grid">
                  {d.photos.map((p, i) => (
                    <PhotoTile
                      key={i}
                      index={i}
                      value={p}
                      title={d.title}
                      propertyType={d.propertyType || 'Village house'}
                      onChange={(v, msg) => {
                        const photos = [...d.photos]
                        photos[i] = v
                        set({ photos })
                        setNotice(msg ?? null)
                      }}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  className="text-link"
                  style={{ marginTop: 8 }}
                  onClick={() => {
                    const i = d.photos.findIndex((x) => !x)
                    if (i >= 0) {
                      const photos = [...d.photos]
                      photos[i] = 'sample'
                      set({ photos })
                    }
                  }}
                >
                  Use sample photo
                </button>
              </Group>
              <Group label="Hours" error={errors.days}>
                <ScheduleEditor rows={rowsFromDays(d.days)} onChange={(rows) => set({ days: daysFromRows(rows) })} showErrors={!!errors.days} />
              </Group>
              <Checkbox checked={d.confirm} onChange={(v) => set({ confirm: v })} error={errors.confirm}>
                I confirm I have the right to rent out this bay
              </Checkbox>
            </>
          )}
        </div>
      </div>
      <div className="bottom-bar">
        <button className="btn btn-primary block" onClick={next} disabled={submitting} aria-busy={submitting}>
          {submitting ? (
            <>
              <span className="spinner" aria-hidden /> Submitting…
            </>
          ) : d.step < 3 ? (
            'Next'
          ) : d.spotId ? (
            'Resubmit application'
          ) : (
            'Submit application'
          )}
        </button>
      </div>
    </div>
  )
}

function Group({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <div className="field">
      <div className="field-label">{label}</div>
      {children}
      {error && (
        <div className="field-error" role="alert">
          {error}
        </div>
      )}
    </div>
  )
}

const pinIcon = L.divIcon({ className: 'pin-wrap', html: '<div class="pin selected"><span>Your bay</span></div>', iconSize: [90, 48], iconAnchor: [45, 46] })

function Recenter({ lat, lng, district }: { lat: number; lng: number; district: string }) {
  const map = useMap()
  const last = useRef(district)
  useEffect(() => {
    if (last.current !== district) {
      last.current = district
      map.setView([lat, lng], 14)
    }
  }, [district, lat, lng, map])
  return null
}

function LocationPicker({ lat, lng, district, onMove }: { lat: number; lng: number; district: string; onMove: (lat: number, lng: number) => void }) {
  const handlers = useMemo(
    () => ({
      dragend: (e: L.LeafletEvent) => {
        const p = (e.target as L.Marker).getLatLng()
        onMove(Math.round(p.lat * 1e5) / 1e5, Math.round(p.lng * 1e5) / 1e5)
      },
    }),
    [onMove],
  )
  return (
    <div className="mini-map">
      <MapContainer center={[lat, lng]} zoom={14} zoomControl={false} attributionControl={false} style={{ height: '100%' }}>
        <TileLayer url={TILE_URL} />
        <Recenter lat={lat} lng={lng} district={district} />
        <Marker position={[lat, lng]} draggable icon={pinIcon} eventHandlers={handlers} keyboard title="Your bay — drag to move" />
      </MapContainer>
      <span className="mini-attrib">© OpenStreetMap contributors</span>
    </div>
  )
}

/** Resize to ≤ 800px and compress to a JPEG data URL under ~120 KB. */
async function compress(file: File): Promise<string> {
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    const scale = Math.min(1, 800 / Math.max(img.naturalWidth, img.naturalHeight))
    const c = document.createElement('canvas')
    c.width = Math.round(img.naturalWidth * scale)
    c.height = Math.round(img.naturalHeight * scale)
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
    for (const q of [0.8, 0.65, 0.5, 0.4, 0.3]) {
      const data = c.toDataURL('image/jpeg', q)
      if (data.length * 0.75 <= MAX_PHOTO_BYTES) return data
    }
    throw new Error('too large')
  } finally {
    URL.revokeObjectURL(url)
  }
}

function PhotoTile({
  index,
  value,
  title,
  propertyType,
  onChange,
}: {
  index: number
  value: string | null
  title: string
  propertyType: string
  onChange: (v: string | null, message?: string) => void
}) {
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const pick = async (f: File | undefined) => {
    if (!f) return
    setBusy(true)
    try {
      onChange(await compress(f))
    } catch {
      onChange('sample', 'That photo couldn’t be stored on this device, so we used an illustration instead.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="photo-tile">
      {value ? (
        <>
          <SpotPhoto spot={{ id: `apply-${index}`, title: title || 'your bay', propertyType: propertyType as never, photoSeed: index + 3, photos: [value] }} className="photo-img" />
          <button type="button" className="icon-btn on-photo photo-remove" aria-label={`Remove photo ${index + 1}`} onClick={() => onChange(null)}>
            <Icon name="close" size={16} />
          </button>
        </>
      ) : (
        <button type="button" className="photo-add" onClick={() => input.current?.click()} disabled={busy} aria-label={`Add photo ${index + 1}`}>
          {busy ? <span className="spinner dark" /> : <Icon name="card" size={22} />}
          <span className="caption">{busy ? 'Resizing…' : 'Add photo'}</span>
        </button>
      )}
      <input ref={input} type="file" accept="image/*" hidden onChange={(e) => void pick(e.target.files?.[0])} data-photo-input={index} />
    </div>
  )
}

function Received({ resubmitted }: { resubmitted: boolean }) {
  return (
    <div className="screen-view">
      <div className="scroll">
        <div className="page" style={{ paddingTop: 40, paddingBottom: 24 }}>
          <span className="status-icon green pop" aria-hidden style={{ width: 64, height: 64 }}>
            <Icon name="check" size={32} stroke={3} />
          </span>
          <h1 className="h1" style={{ marginTop: 16 }}>
            {resubmitted ? 'Application resubmitted' : 'Application received'}
          </h1>
          <p className="muted" style={{ marginTop: 6 }}>
            Plug &amp; Park checks every bay before it goes on the map. You'll get a notification when it's approved.
          </p>
          <ol className="timeline" aria-label="Application progress">
            <li className="done">
              <span className="dot">
                <Icon name="check" size={14} stroke={3} />
              </span>
              <div>
                <b>Submitted</b>
                <div className="caption">Photos, charger details and hours</div>
              </div>
            </li>
            <li className="current" aria-current="step">
              <span className="dot" />
              <div>
                <b>Under review by Plug &amp; Park</b>
                <div className="caption">Usually within a day (demo: use Platform actions in the Demo sheet)</div>
              </div>
            </li>
            <li>
              <span className="dot" />
              <div>
                <b>Go live</b>
                <div className="caption">Add your gate PIN and payout details</div>
              </div>
            </li>
          </ol>
        </div>
      </div>
      <div className="bottom-bar">
        <button className="btn btn-primary block" onClick={() => navigate('/owner', { replace: true })}>
          Back to home
        </button>
      </div>
    </div>
  )
}
