// Explore: full-bleed Leaflet map + filters + a three-snap bottom sheet (list / preview).
// Loaded lazily (React.lazy) so the landing page doesn't pay for Leaflet.

import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet'
import { BottomSheet } from '../../components/BottomSheet'
import { Icon } from '../../components/Icon'
import { SnapSheet, type Snap } from '../../components/SnapSheet'
import { SpotPhoto } from '../../components/SpotPhoto'
import type { ChargerType, District, Spot } from '../../data/types'
import { openStatus } from '../../lib/availability'
import { groupPins, type PinGroup } from '../../lib/pins'
import { navigate } from '../../lib/router'
import {
  CHARGER_TYPES,
  DISTRICTS,
  districtCounts,
  filterSpots,
  hasFilters,
  NO_FILTERS,
  sortSpots,
  type SortKey,
  type SpotFilters,
} from '../../lib/spots'
import { useDB } from '../../lib/store'
import { cx, hkd } from '../../lib/util'

const HK_CENTER: L.LatLngTuple = [22.36, 114.13]
const HK_ZOOM = 11
const FIT_MAX_ZOOM = 15 // a single result never zooms in past street level
const PIN_W = 64
const GROUP_W = 104 // widest group pin ("12 · $20+")
const PIN_H = 48
// Roomy enough that the fitted all-pins view (zoom 10) can still be panned in every direction.
const HK_BOUNDS = L.latLngBounds([21.6, 113.2], [23.1, 115.0])
// CARTO's basemaps now return an "API key required" watermark, so we use the standard
// OpenStreetMap tiles (no key) and mute them with CSS (.map .leaflet-tile-pane) for a Positron-like look.
const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
// Opens in a new tab: inside the presenter view the app runs in an iframe, and following the link there
// would replace the phone with a page that refuses to load in a frame.
const ATTRIBUTION = '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'

// Map UI state survives a trip to spot details and back.
interface UiState {
  filters: SpotFilters
  sort: SortKey
  selectedId: string | null
  snap: Snap
}
let saved: UiState = { filters: NO_FILTERS, sort: 'price', selectedId: null, snap: 'peek' }

export default function MapHome() {
  const db = useDB()
  const [filters, setFilters] = useState(saved.filters)
  const [sort, setSort] = useState(saved.sort)
  const [selectedId, setSelectedId] = useState(saved.selectedId)
  const [snap, setSnap] = useState<Snap>(saved.snap)
  const [districtOpen, setDistrictOpen] = useState(false)
  const [tilesFailed, setTilesFailed] = useState(false)
  const [sheetPx, setSheetPx] = useState(120)
  const [flyDistrict, setFlyDistrict] = useState(0) // bump to trigger a district fly-to
  const [zoom, setZoom] = useState(HK_ZOOM)
  const [groupTap, setGroupTap] = useState<{ ids: string[]; n: number } | null>(null) // a tapped group pin to zoom into
  const tileStats = useRef({ loaded: 0, errors: 0 })

  useEffect(() => {
    saved = { filters, sort, selectedId, snap }
  }, [filters, sort, selectedId, snap])

  const now = new Date()
  const visible = useMemo(() => sortSpots(filterSpots(db.spots, filters, now), sort), [db.spots, filters, sort, now.getHours(), now.getMinutes()]) // eslint-disable-line react-hooks/exhaustive-deps
  const counts = useMemo(() => districtCounts(db.spots), [db.spots])
  // Pins that would overlap at this zoom merge into one group pin; the selected spot keeps its own.
  const pins = useMemo(() => groupPins(visible, zoom, selectedId), [visible, zoom, selectedId])
  const selected = selectedId ? (visible.find((s) => s.id === selectedId) ?? null) : null

  // Deselect if the selected spot got filtered out.
  useEffect(() => {
    if (selectedId && !selected) setSelectedId(null)
  }, [selectedId, selected])

  const select = (id: string) => {
    setSelectedId(id)
    setSnap('half')
  }
  const deselect = () => {
    setSelectedId(null)
    setSnap('half')
  }
  const setCharger = (c: ChargerType | null) => setFilters((f) => ({ ...f, charger: c }))
  const pickDistrict = (d: District | null) => {
    setFilters((f) => ({ ...f, district: d }))
    setSelectedId(null)
    setDistrictOpen(false)
    setFlyDistrict((n) => n + 1)
  }
  const clearFilters = () => {
    setFilters(NO_FILTERS)
    setFlyDistrict((n) => n + 1)
  }

  // Tile failure fallback: errors and nothing loaded after 4 s (re-checked at 8 s).
  useEffect(() => {
    const check = () => {
      const t = tileStats.current
      if (t.loaded === 0 && t.errors > 0) {
        setTilesFailed(true)
        setSelectedId(null)
        setSnap('full')
      }
    }
    const t1 = window.setTimeout(check, 4000)
    const t2 = window.setTimeout(check, 8000)
    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
    }
  }, [])

  const count = visible.length

  return (
    <div className="map-home" style={{ ['--sheet-h' as string]: `${sheetPx}px` }}>
      <MapContainer
        className="map"
        center={HK_CENTER}
        zoom={HK_ZOOM}
        minZoom={10}
        maxZoom={17}
        maxBounds={HK_BOUNDS}
        maxBoundsViscosity={0.8}
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer
          url={TILE_URL}
          attribution={ATTRIBUTION}
          eventHandlers={{
            tileload: () => tileStats.current.loaded++,
            tileerror: () => tileStats.current.errors++,
          }}
        />
        <MapEffects
          selected={selected}
          visible={visible}
          flyDistrict={flyDistrict}
          sheetPx={sheetPx}
          groupTap={groupTap}
          onZoom={setZoom}
          onGroupStuck={(ids) => select(ids[0])}
          onMapTap={() => selectedId && deselect()}
        />
        {pins.map((g) =>
          g.spots.length === 1 ? (
            <Marker
              key={g.key}
              position={[g.lat, g.lng]}
              icon={pinIcon(g.spots[0], g.spots[0].id === selectedId)}
              zIndexOffset={g.spots[0].id === selectedId ? 1000 : 0}
              title={`${g.spots[0].title}, ${hkd(g.spots[0].pricePerHour)} per hour`}
              eventHandlers={{ click: () => select(g.spots[0].id) }}
            />
          ) : (
            <Marker
              key={g.key}
              position={[g.lat, g.lng]}
              icon={groupIcon(g)}
              title={`${g.spots.length} chargers, from ${hkd(Math.min(...g.spots.map((s) => s.pricePerHour)))} per hour`}
              eventHandlers={{ click: () => setGroupTap((t) => ({ ids: [...g.spots].sort((a, b) => a.pricePerHour - b.pricePerHour).map((s) => s.id), n: (t?.n ?? 0) + 1 })) }}
            />
          ),
        )}
      </MapContainer>

      <div className={cx('map-attribution', snap === 'full' && 'hidden')} dangerouslySetInnerHTML={{ __html: ATTRIBUTION }} />

      {/* Top overlay: search pill + filter chips */}
      <div className="map-top">
        <button className="search-pill" onClick={() => setDistrictOpen(true)} aria-haspopup="dialog">
          <Icon name="search" size={20} />
          <span className={cx('search-text', !filters.district && 'placeholder')}>{filters.district ?? 'Where do you need to charge?'}</span>
          {filters.district && (
            <span
              role="button"
              tabIndex={0}
              className="search-clear"
              aria-label="Clear district"
              onClick={(e) => {
                e.stopPropagation()
                pickDistrict(null)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.stopPropagation()
                  pickDistrict(null)
                }
              }}
            >
              <Icon name="close" size={16} />
            </span>
          )}
        </button>
        <div className="chip-row" role="toolbar" aria-label="Filters">
          <button className={cx('chip', !filters.charger && 'active')} aria-pressed={!filters.charger} onClick={() => setCharger(null)}>
            All
          </button>
          {CHARGER_TYPES.map((c) => (
            <button key={c} className={cx('chip', filters.charger === c && 'active')} aria-pressed={filters.charger === c} onClick={() => setCharger(filters.charger === c ? null : c)}>
              {c}
            </button>
          ))}
          <button className={cx('chip', filters.openNow && 'active')} aria-pressed={filters.openNow} onClick={() => setFilters((f) => ({ ...f, openNow: !f.openNow }))}>
            Open now
          </button>
          <button className={cx('chip', filters.under25 && 'active')} aria-pressed={filters.under25} onClick={() => setFilters((f) => ({ ...f, under25: !f.under25 }))}>
            Under $25
          </button>
        </div>
      </div>

      <SnapSheet snap={snap} onSnap={setSnap} onHeight={setSheetPx} label={selected ? selected.title : 'Chargers'}>
        {selected ? (
          <SpotPreview spot={selected} now={now} onClose={deselect} />
        ) : (
          <>
            {tilesFailed && (
              <div className="map-banner" role="status">
                <Icon name="info" size={18} /> Map unavailable — showing list
              </div>
            )}
            <div className="sheet-title-row">
              <h2 className="h2" aria-live="polite">
                {count === 1 ? '1 charger nearby' : `${count} chargers nearby`}
              </h2>
              <div className="segmented" role="group" aria-label="Sort by">
                {(['price', 'rating'] as const).map((k) => (
                  <button key={k} className={cx(sort === k && 'active')} aria-pressed={sort === k} onClick={() => setSort(k)}>
                    {k === 'price' ? 'Price' : 'Rating'}
                  </button>
                ))}
              </div>
            </div>
            {count === 0 ? (
              <div className="empty-state compact">
                <span className="empty-icon">
                  <Icon name="search" size={28} />
                </span>
                <div className="h3" style={{ marginTop: 14 }}>
                  No chargers match these filters
                </div>
                <p className="muted" style={{ marginTop: 4 }}>
                  Try another district or charger type.
                </p>
                {hasFilters(filters) && (
                  <button className="btn btn-primary sm" style={{ marginTop: 16 }} onClick={clearFilters}>
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              <ul className="spot-list">
                {visible.map((s) => (
                  <li key={s.id}>
                    <SpotCard spot={s} now={now} onClick={() => select(s.id)} />
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </SnapSheet>

      <BottomSheet open={districtOpen} onClose={() => setDistrictOpen(false)} title="Choose a district" labelId="district-title">
        <ul className="district-list">
          <li>
            <button className={cx('list-row list-button', !filters.district && 'current')} onClick={() => pickDistrict(null)}>
              <span className="list-icon">
                <Icon name="map" size={20} />
              </span>
              <span style={{ flex: 1, fontWeight: 600 }}>All districts</span>
              <span className="caption">{db.spots.filter((s) => s.active && s.reviewStatus === 'approved').length}</span>
              {!filters.district && <Icon name="check" size={20} />}
            </button>
          </li>
          {DISTRICTS.map((d) => (
            <li key={d}>
              <button className={cx('list-row list-button', filters.district === d && 'current')} onClick={() => pickDistrict(d)}>
                <span className="list-icon">
                  <Icon name="pin" size={20} />
                </span>
                <span style={{ flex: 1, fontWeight: 600 }}>{d}</span>
                <span className="caption">{counts[d] === 1 ? '1 charger' : `${counts[d]} chargers`}</span>
                {filters.district === d && <Icon name="check" size={20} />}
              </button>
            </li>
          ))}
        </ul>
      </BottomSheet>
    </div>
  )
}

// Cache icons so Leaflet doesn't rebuild every pin's DOM on each render.
const iconCache = new Map<string, L.DivIcon>()
function pinIcon(spot: Spot, selected: boolean) {
  const key = `${spot.id}|${spot.pricePerHour}|${selected}`
  let icon = iconCache.get(key)
  if (!icon) {
    icon = makePinIcon(spot, selected)
    iconCache.set(key, icon)
  }
  return icon
}
function makePinIcon(spot: Spot, selected: boolean) {
  return L.divIcon({
    className: 'pin-wrap',
    html: `<div class="pin${selected ? ' selected' : ''}" data-spot="${spot.id}"><span>$${spot.pricePerHour}</span></div>`,
    iconSize: [PIN_W, PIN_H],
    iconAnchor: [PIN_W / 2, PIN_H - 2],
  })
}
function groupIcon(g: PinGroup) {
  let icon = iconCache.get(g.key + '|' + g.label)
  if (!icon) {
    icon = L.divIcon({
      className: 'pin-wrap',
      html: `<div class="pin group" data-count="${g.spots.length}" data-spots="${g.spots.map((s) => s.id).join(' ')}"><span>${g.label}</span></div>`,
      iconSize: [GROUP_W, PIN_H],
      iconAnchor: [GROUP_W / 2, PIN_H - 2],
    })
    iconCache.set(g.key + '|' + g.label, icon)
  }
  return icon
}

/** Imperative bits: fly-to on selection, fit-to-pins, tile-failure detection, map taps. */
function MapEffects({
  selected,
  visible,
  flyDistrict,
  sheetPx,
  groupTap,
  onZoom,
  onGroupStuck,
  onMapTap,
}: {
  selected: Spot | null
  visible: Spot[]
  groupTap: { ids: string[]; n: number } | null
  onZoom: (zoom: number) => void
  /** A group that can't be split by zooming (already at max zoom): ids, cheapest first. */
  onGroupStuck: (ids: string[]) => void
  flyDistrict: number
  sheetPx: number
  onMapTap: () => void
}) {
  const map = useMap()
  const sheetRef = useRef(sheetPx)
  sheetRef.current = sheetPx
  const tapRef = useRef(onMapTap)
  tapRef.current = onMapTap

  // Pan so the target sits in the visible area above the sheet.
  const flyTo = (latlng: L.LatLngExpression, zoom: number) => {
    const p = map.project(latlng, zoom).add([0, Math.min(sheetRef.current, map.getSize().y * 0.6) / 2])
    map.flyTo(map.unproject(p, zoom), zoom, { duration: 0.6 })
  }

  // Fit every matching pin into the area between the top overlay and the sheet (RF-4).
  const userMoved = useRef(false)
  const fitPadding = () => {
    const top = map.getContainer().parentElement?.querySelector<HTMLElement>('.map-top')?.offsetHeight ?? 130
    const sheet = Math.min(sheetRef.current, map.getSize().y * 0.6)
    // Pins are anchored at their bottom centre, so pad by the pin size too (a group pin is the widest).
    return { paddingTopLeft: [GROUP_W / 2 + 4, top + PIN_H - 8] as L.PointTuple, paddingBottomRight: [GROUP_W / 2 + 4, sheet + 12] as L.PointTuple }
  }
  const fitVisible = (animate: boolean) => {
    userMoved.current = false
    if (!visible.length) {
      map.setView(HK_CENTER, HK_ZOOM, { animate })
      return
    }
    const b = L.latLngBounds(visible.map((s) => [s.lat, s.lng] as L.LatLngTuple))
    map.fitBounds(b, { ...fitPadding(), maxZoom: FIT_MAX_ZOOM, animate, duration: 0.6 })
  }
  const fitRef = useRef(fitVisible)
  fitRef.current = fitVisible
  const selectedRef = useRef(selected)
  selectedRef.current = selected

  useEffect(() => {
    if (selected) flyTo([selected.lat, selected.lng], Math.max(map.getZoom(), 14))
  }, [selected?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // On load, when the matching set changes, and on district pick / clear filters.
  const visibleKey = visible.map((s) => s.id).sort().join()
  const first = useRef(true)
  useEffect(() => {
    const animate = !first.current
    first.current = false
    if (!selected) fitVisible(animate)
  }, [visibleKey, flyDistrict]) // eslint-disable-line react-hooks/exhaustive-deps

  // A tapped group pin: zoom to fit its members so they show as separate price pins (RF-12).
  useEffect(() => {
    if (!groupTap) return
    const members = visible.filter((s) => groupTap.ids.includes(s.id))
    if (members.length < 2) return
    userMoved.current = true // keep this view on resize
    const b = L.latLngBounds(members.map((s) => [s.lat, s.lng] as L.LatLngTuple))
    // Members will show as price pins after the zoom, so pad for those (narrower than a group pin).
    const pad = { ...fitPadding() }
    pad.paddingTopLeft = [PIN_W / 2 + 6, pad.paddingTopLeft[1]]
    pad.paddingBottomRight = [PIN_W / 2 + 6, pad.paddingBottomRight[1]]
    const fitZoom = Math.min(FIT_MAX_ZOOM, map.getBoundsZoom(b, false, L.point(pad.paddingTopLeft).add(pad.paddingBottomRight)))
    if (fitZoom > map.getZoom()) map.fitBounds(b, { ...pad, maxZoom: FIT_MAX_ZOOM, duration: 0.6 })
    else if (map.getZoom() < map.getMaxZoom()) flyTo(b.getCenter(), map.getZoom() + 1)
    else onGroupStuck(groupTap.ids)
  }, [groupTap?.n]) // eslint-disable-line react-hooks/exhaustive-deps

  // Report the zoom level (integer steps) so pins regroup after every zoom.
  const zoomRef = useRef(onZoom)
  zoomRef.current = onZoom
  useEffect(() => {
    const report = () => zoomRef.current(Math.round(map.getZoom()))
    report()
    map.on('zoomend', report)
    return () => {
      map.off('zoomend', report)
    }
  }, [map])

  useEffect(() => {
    const onClick = () => tapRef.current()
    const onDrag = () => (userMoved.current = true)
    map.on('click', onClick)
    map.on('dragstart', onDrag)
    return () => {
      map.off('click', onClick)
      map.off('dragstart', onDrag)
    }
  }, [map])

  // The map container can change size (frame scaling, sheet) — keep Leaflet in sync.
  useEffect(() => {
    const ro = new ResizeObserver(() => {
      map.invalidateSize()
      // Until the user pans, keep every pin in view at the new size.
      if (!userMoved.current && !selectedRef.current) fitRef.current(false)
    })
    ro.observe(map.getContainer())
    return () => ro.disconnect()
  }, [map])

  return null
}

function OpenBadge({ spot, now }: { spot: Spot; now: Date }) {
  const st = openStatus(spot, now)
  return <span className={cx('badge', st.open ? 'green' : 'amber')}>{st.label}</span>
}

function Rating({ spot }: { spot: Spot }) {
  return (
    <span className="rating">
      <Icon name="star" size={14} fill="currentColor" stroke={0} />
      <b>{spot.rating.toFixed(1)}</b>
      <span className="caption">({spot.reviewsCount})</span>
    </span>
  )
}

function SpotCard({ spot, now, onClick }: { spot: Spot; now: Date; onClick: () => void }) {
  return (
    <button className="spot-card" onClick={onClick} data-spot={spot.id}>
      <SpotPhoto spot={spot} className="spot-thumb" />
      <span className="spot-card-body">
        <span className="spot-card-title">{spot.title}</span>
        <span className="caption">
          {spot.district} · {spot.chargerType} · {spot.powerKw} kW
        </span>
        <span className="row" style={{ gap: 8, marginTop: 4 }}>
          <Rating spot={spot} />
          <OpenBadge spot={spot} now={now} />
        </span>
      </span>
      <span className="spot-card-price">
        <b>{hkd(spot.pricePerHour)}</b>
        <span className="caption">/ hour</span>
      </span>
    </button>
  )
}

function SpotPreview({ spot, now, onClose }: { spot: Spot; now: Date; onClose: () => void }) {
  return (
    <div className="spot-preview" data-spot={spot.id}>
      <div className="spot-preview-photo">
        <SpotPhoto spot={spot} />
        <button className="icon-btn on-photo" onClick={onClose} aria-label="Close preview">
          <Icon name="close" size={20} />
        </button>
      </div>
      <div className="row" style={{ alignItems: 'flex-start', marginTop: 14 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 className="h2">{spot.title}</h2>
          <p className="caption" style={{ marginTop: 4 }}>
            {spot.address}
          </p>
        </div>
        <div className="spot-card-price">
          <b style={{ fontSize: 20 }}>{hkd(spot.pricePerHour)}</b>
          <span className="caption">/ hour</span>
        </div>
      </div>
      <div className="row" style={{ gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
        <Rating spot={spot} />
        <span className="badge">
          <Icon name="plug" size={14} /> {spot.chargerType} · {spot.powerKw} kW
        </span>
        <OpenBadge spot={spot} now={now} />
      </div>
      <button className="btn btn-primary block" style={{ marginTop: 16 }} onClick={() => navigate(`/app/spot/${spot.id}`)}>
        View details
      </button>
    </div>
  )
}
