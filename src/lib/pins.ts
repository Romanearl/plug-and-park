// Map pins: merge price pins that would overlap on screen into one group pin (RF-12).
// Pure functions (no Leaflet), so the checks can run them in Node.
// The group label is kept short on purpose: a wider pill ("2 · from $23") swallows its neighbours at the
// all-Hong-Kong zoom and ends up as one pin for five far-apart chargers, which a single tap can't split.

import type { Spot } from '../data/types'

type PinSpot = Pick<Spot, 'id' | 'lat' | 'lng' | 'pricePerHour'>

export interface PinGroup<S extends PinSpot = Spot> {
  /** Stable React key: the member ids. */
  key: string
  spots: S[]
  lat: number
  lng: number
  /** "$30" for one spot, "2 · $23+" for a group (count · lowest price). */
  label: string
}

// Pin geometry in CSS px (see .pin in app.css). Widths are estimates on the generous side.
const PIN_H = 36 // pill (30) + tail (6)
const GAP = 3
export const pinWidth = (label: string) => Math.max(50, 26 + label.length * 7.2)

/** Web-Mercator pixel position at an integer zoom (same maths as Leaflet's EPSG:3857). */
export function project(lat: number, lng: number, zoom: number) {
  const scale = 256 * 2 ** zoom
  const sin = Math.sin((lat * Math.PI) / 180)
  return { x: (scale * (lng + 180)) / 360, y: scale * (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) }
}

export const pinLabel = (spots: PinSpot[]) =>
  spots.length === 1 ? `$${spots[0].pricePerHour}` : `${spots.length} · $${Math.min(...spots.map((s) => s.pricePerHour))}+`

function makeGroup<S extends PinSpot>(spots: S[]): PinGroup<S> {
  const lat = spots.reduce((a, s) => a + s.lat, 0) / spots.length
  const lng = spots.reduce((a, s) => a + s.lng, 0) / spots.length
  return { key: spots.map((s) => s.id).join('+'), spots, lat, lng, label: pinLabel(spots) }
}

/**
 * Groups spots whose pins would overlap at `zoom`. Merging widens a pin, so it repeats until nothing overlaps.
 * The selected spot always keeps its own pin.
 */
export function groupPins<S extends PinSpot>(spots: S[], zoom: number, selectedId: string | null = null): PinGroup<S>[] {
  let groups = spots.filter((s) => s.id !== selectedId).map((s) => makeGroup([s]))
  const overlaps = (a: PinGroup<S>, b: PinGroup<S>) => {
    const pa = project(a.lat, a.lng, zoom)
    const pb = project(b.lat, b.lng, zoom)
    return Math.abs(pa.x - pb.x) < (pinWidth(a.label) + pinWidth(b.label)) / 2 + GAP && Math.abs(pa.y - pb.y) < PIN_H + GAP
  }
  for (let merged = true; merged; ) {
    merged = false
    outer: for (let i = 0; i < groups.length; i++) {
      for (let j = i + 1; j < groups.length; j++) {
        if (overlaps(groups[i], groups[j])) {
          const g = makeGroup([...groups[i].spots, ...groups[j].spots])
          groups = groups.filter((_, k) => k !== i && k !== j).concat(g)
          merged = true
          break outer
        }
      }
    }
  }
  const selected = spots.find((s) => s.id === selectedId)
  return selected ? [...groups, makeGroup([selected])] : groups
}
