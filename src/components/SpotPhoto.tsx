// Deterministic flat SVG "photos" of a charging spot (real photos arrive in S8).
// Scene depends on the property type; the photo index changes the viewpoint so a
// carousel never repeats itself. Colours come from the design tokens.

import { useState, useSyncExternalStore } from 'react'
import type { Spot } from '../data/types'

type Scene = 'garage' | 'driveway' | 'industrial' | 'carpark'

const C = {
  ink: '#1f1f1f',
  ink3: '#333333',
  muted: '#8f8f8f',
  line: '#d9d9d9',
  surface: '#f3f3f3',
  surface2: '#e6e6e6',
  blue: '#7399c6',
  blueDeep: '#3e5f8a',
  blueTint: '#eaf0f8',
  blueInk: '#1c2f4a',
}
const CAR_COLOURS = [C.blueInk, C.blueDeep, C.ink3, '#a9b4c2', C.blue, '#5a6573']

function sceneFor(spot: Pick<Spot, 'propertyType' | 'photoSeed'>): Scene {
  switch (spot.propertyType) {
    case 'Village house':
      return spot.photoSeed % 2 === 0 ? 'garage' : 'driveway'
    case 'Industrial building':
      return 'industrial'
    default:
      return 'carpark'
  }
}

/** Side-view hatchback; (x, y) = left end of the ground line. */
function Car({ x, y, s = 1, colour }: { x: number; y: number; s?: number; colour: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx="80" cy="2" rx="86" ry="6" fill="#000" opacity=".12" />
      <path d="M4 -14 Q2 -34 22 -38 L50 -42 Q66 -64 98 -64 L120 -64 Q140 -62 152 -40 Q164 -36 162 -14 Z" fill={colour} />
      <path d="M58 -42 Q70 -58 96 -58 L104 -58 L104 -42 Z M110 -58 L120 -58 Q134 -56 142 -42 L110 -42 Z" fill={C.blueTint} opacity=".85" />
      <circle cx="38" cy="-12" r="14" fill={C.ink} />
      <circle cx="38" cy="-12" r="6" fill={C.muted} />
      <circle cx="128" cy="-12" r="14" fill={C.ink} />
      <circle cx="128" cy="-12" r="6" fill={C.muted} />
      <rect x="150" y="-34" width="8" height="5" rx="2" fill="#fff" opacity=".8" />
    </g>
  )
}

/** Wall box or pedestal charger with a cable; (x, y) = base. */
function Charger({ x, y, s = 1, pedestal = false, cableTo }: { x: number; y: number; s?: number; pedestal?: boolean; cableTo?: [number, number] }) {
  return (
    <g>
      {cableTo && (
        <path
          d={`M${x + 10 * s} ${y - 40 * s} C ${x + 10 * s} ${y + 10}, ${cableTo[0]} ${y + 10}, ${cableTo[0]} ${cableTo[1]}`}
          fill="none"
          stroke={C.ink}
          strokeWidth={3 * s}
          strokeLinecap="round"
        />
      )}
      <g transform={`translate(${x} ${y}) scale(${s})`}>
        {pedestal && <rect x="4" y="-40" width="12" height="40" fill={C.ink3} />}
        <rect x="-4" y={pedestal ? -86 : -66} width="28" height="46" rx="6" fill={C.blue} />
        <rect x="2" y={pedestal ? -78 : -58} width="16" height="10" rx="2" fill={C.blueInk} />
        <path d={pedestal ? 'M11 -62 6 -54h4l-2 7 6-9h-4l2-6Z' : 'M11 -42 6 -34h4l-2 7 6-9h-4l2-6Z'} fill={C.blueInk} />
      </g>
    </g>
  )
}

function Garage({ v, car }: { v: number; car: string }) {
  if (v === 1)
    return (
      <>
        <rect width="390" height="260" fill={C.surface2} />
        <rect x="0" y="200" width="390" height="60" fill={C.line} />
        <rect x="40" y="30" width="310" height="170" fill={C.surface} />
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <rect key={i} x="40" y={40 + i * 20} width="310" height="2" fill={C.line} />
        ))}
        <Charger x={180} y={196} s={1.9} cableTo={[300, 250]} />
        <circle cx="300" cy="250" r="7" fill={C.ink} />
      </>
    )
  if (v === 2)
    return (
      <>
        <rect width="390" height="260" fill={C.blueTint} />
        <path d="M0 150 L120 110 L250 120 L390 90 L390 260 L0 260 Z" fill="#d8e3ef" />
        <rect x="70" y="70" width="250" height="150" fill="#fff" />
        <path d="M60 74 L195 20 L330 74 Z" fill={C.blueInk} />
        <rect x="130" y="120" width="130" height="100" fill={C.blue} />
        {[0, 1, 2, 3].map((i) => (
          <rect key={i} x="130" y={132 + i * 22} width="130" height="3" fill={C.blueDeep} />
        ))}
        <rect x="270" y="150" width="24" height="18" rx="3" fill={C.ink3} />
        <rect x="0" y="220" width="390" height="40" fill={C.line} />
      </>
    )
  return (
    <>
      <rect width="390" height="260" fill={C.ink3} />
      <rect x="30" y="40" width="330" height="200" fill={C.surface2} />
      <rect x="30" y="40" width="330" height="22" fill={C.blue} />
      {[0, 1, 2].map((i) => (
        <rect key={i} x="30" y={48 + i * 5} width="330" height="1.5" fill={C.blueDeep} />
      ))}
      <rect x="30" y="200" width="330" height="40" fill={C.line} />
      <Car x={70} y={214} colour={car} />
      <Charger x={300} y={170} cableTo={[236, 190]} />
    </>
  )
}

function Driveway({ v, car }: { v: number; car: string }) {
  return (
    <>
      <rect width="390" height="260" fill={C.blueTint} />
      <circle cx={v === 2 ? 70 : 320} cy="56" r="22" fill="#fff" />
      <path d="M0 140 Q90 110 180 130 T390 120 L390 260 L0 260 Z" fill="#cfdceb" />
      <rect x={v === 1 ? 210 : 20} y="90" width="160" height="110" fill="#fff" />
      <path d={v === 1 ? 'M200 94 L290 50 L380 94 Z' : 'M10 94 L100 50 L190 94 Z'} fill={C.blueDeep} />
      <rect x={v === 1 ? 236 : 46} y="120" width="36" height="30" fill={C.blueTint} />
      <rect x={v === 1 ? 300 : 110} y="140" width="36" height="60" fill={C.blueInk} />
      <path d="M120 260 L170 200 L330 200 L390 260 Z" fill={C.surface2} />
      {v === 1 ? (
        <>
          <Charger x={70} y={210} s={1.3} pedestal cableTo={[150, 236]} />
          <Car x={150} y={244} s={1.05} colour={car} />
        </>
      ) : (
        <>
          <Car x={180} y={236} s={v === 2 ? 0.85 : 1} colour={car} />
          <Charger x={346} y={214} pedestal />
        </>
      )}
    </>
  )
}

function Industrial({ v, car }: { v: number; car: string }) {
  return (
    <>
      <rect width="390" height="260" fill="#9aa3ad" />
      <rect y="0" width="390" height="48" fill={C.ink3} />
      {[50, 170, 290].map((x) => (
        <rect key={x} x={x} y="10" width="60" height="6" rx="3" fill="#fff" opacity=".85" />
      ))}
      {[0, 1, 2].map((i) => (
        <rect key={i} x={v === 1 ? 20 + i * 140 : 90 + i * 140} y="48" width="26" height="160" fill="#c9cfd6" />
      ))}
      <rect y="200" width="390" height="60" fill="#7c858f" />
      {[60, 200, 340].map((x) => (
        <rect key={x} x={x - (v === 2 ? 20 : 0)} y="206" width="5" height="54" fill="#fff" opacity=".8" />
      ))}
      {v !== 2 && <Car x={v === 1 ? 160 : 40} y={232} colour={car} />}
      <Charger x={v === 1 ? 96 : 262} y={192} s={v === 2 ? 1.7 : 1.1} cableTo={v === 2 ? undefined : [v === 1 ? 168 : 196, 212]} />
      <rect x="300" y="64" width="64" height="30" rx="4" fill={C.blue} />
      <text x="332" y="85" textAnchor="middle" fontFamily="Inter, Arial, sans-serif" fontWeight="800" fontSize="18" fill={C.ink}>
        EV
      </text>
    </>
  )
}

function Carpark({ v, car, bay }: { v: number; car: string; bay: number }) {
  return (
    <>
      <rect width="390" height="260" fill={C.surface2} />
      <rect y="0" width="390" height="40" fill={C.line} />
      {[60, 195, 330].map((x) => (
        <rect key={x} x={x - 30} y="16" width="60" height="5" rx="2.5" fill="#fff" />
      ))}
      <rect y="190" width="390" height="70" fill="#cfd4da" />
      <rect x={v === 1 ? 250 : 20} y="60" width="80" height="130" fill={C.surface} />
      <text
        x={v === 1 ? 290 : 60}
        y="110"
        textAnchor="middle"
        fontFamily="Inter, Arial, sans-serif"
        fontWeight="800"
        fontSize="30"
        fill={C.blueInk}
      >
        {bay}
      </text>
      <rect x="0" y="186" width="390" height="6" fill={C.blue} />
      {v === 2 ? (
        <>
          <path d="M80 260 L150 120 L240 120 L310 260 Z" fill="#bcc3cb" />
          <rect x="150" y="70" width="90" height="34" rx="6" fill={C.ink} />
          <text x="195" y="93" textAnchor="middle" fontFamily="Inter, Arial, sans-serif" fontWeight="700" fontSize="16" fill="#fff">
            EV only
          </text>
          <Charger x={330} y={200} pedestal />
        </>
      ) : (
        <>
          <Car x={v === 1 ? 50 : 130} y={228} colour={car} />
          <Charger x={v === 1 ? 220 : 330} y={200} pedestal cableTo={[v === 1 ? 210 : 290, 205]} />
        </>
      )}
    </>
  )
}

// ── Real photos: public/photos/manifest.json maps spot ids to files (see public/photos/README.md) ──
type Manifest = Record<string, string[]>
let manifest: Manifest = {}
let manifestLoaded = false
const manifestListeners = new Set<() => void>()
function loadManifest() {
  if (manifestLoaded) return
  manifestLoaded = true
  fetch(`${import.meta.env.BASE_URL}photos/manifest.json`, { cache: 'no-cache' })
    .then((r) => (r.ok ? r.json() : {}))
    .then((m: unknown) => {
      if (m && typeof m === 'object') {
        manifest = m as Manifest
        manifestListeners.forEach((l) => l())
      }
    })
    .catch(() => {
      /* no manifest → illustrations only */
    })
}
function useManifest(): Manifest {
  return useSyncExternalStore(
    (l) => {
      manifestListeners.add(l)
      loadManifest()
      return () => {
        manifestListeners.delete(l)
      }
    },
    () => manifest,
  )
}

export function SpotPhoto(props: {
  spot: Pick<Spot, 'id' | 'propertyType' | 'photoSeed' | 'title'> & { photos?: string[] }
  index?: number
  className?: string
  rounded?: number
}) {
  const { spot, index = 0, className, rounded = 0 } = props
  const m = useManifest()
  const [broken, setBroken] = useState<string | null>(null)
  const uploaded = spot.photos?.[index]
  if (uploaded && uploaded.startsWith('data:image/')) {
    return <img className={className} src={uploaded} alt={`Photo ${index + 1} of ${spot.title}`} style={{ objectFit: 'cover', borderRadius: rounded || undefined }} />
  }
  const file = m[spot.id]?.[index]
  if (file && broken !== file) {
    return (
      <img
        className={className}
        src={`${import.meta.env.BASE_URL}photos/${file}`}
        alt={`Photo ${index + 1} of ${spot.title}`}
        loading="lazy"
        decoding="async"
        onError={() => setBroken(file)}
        style={{ objectFit: 'cover', borderRadius: rounded || undefined, background: 'var(--surface)' }}
        data-photo={file}
      />
    )
  }
  return <Illustration spot={spot} index={index} className={className} rounded={rounded} />
}

function Illustration({
  spot,
  index,
  className,
  rounded,
}: {
  spot: Pick<Spot, 'id' | 'propertyType' | 'photoSeed' | 'title'>
  index: number
  className?: string
  rounded: number
}) {
  const scene = sceneFor(spot)
  const v = (index + spot.photoSeed) % 3
  const car = CAR_COLOURS[(spot.photoSeed + index) % CAR_COLOURS.length]
  const uid = `${spot.id}-${index}-${rounded}`
  return (
    <svg className={className} viewBox="0 0 390 260" preserveAspectRatio="xMidYMid slice" role="img" aria-label={`Illustration ${index + 1} of ${spot.title}`}>
      <defs>
        <clipPath id={`sp-clip-${uid}`}>
          <rect width="390" height="260" rx={rounded} />
        </clipPath>
        {/* Soft light from the top + darker floor edge = depth */}
        <linearGradient id={`sp-light-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity={scene === 'driveway' ? 0 : 0.22} />
          <stop offset="0.55" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.16" />
        </linearGradient>
        <radialGradient id={`sp-vig-${uid}`} cx="50%" cy="45%" r="75%">
          <stop offset="0.6" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.18" />
        </radialGradient>
      </defs>
      <g clipPath={`url(#sp-clip-${uid})`}>
        {scene === 'garage' && <Garage v={v} car={car} />}
        {scene === 'driveway' && <Driveway v={v} car={car} />}
        {scene === 'industrial' && <Industrial v={v} car={car} />}
        {scene === 'carpark' && <Carpark v={v} car={car} bay={12 + spot.photoSeed * 7} />}
        <rect width="390" height="260" fill={`url(#sp-light-${uid})`} />
        <rect width="390" height="260" fill={`url(#sp-vig-${uid})`} />
      </g>
    </svg>
  )
}
