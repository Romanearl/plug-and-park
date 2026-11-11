// Non-modal bottom sheet with three snap points (peek / half / full), sitting over a map.
// Drag the handle area to resize; tap it to step peek → half → full → peek.
// Positioned absolutely inside its parent (never fixed to the window).

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { cx } from '../lib/util'

export type Snap = 'peek' | 'half' | 'full'
const ORDER: Snap[] = ['peek', 'half', 'full']
const PEEK = 120
const TOP_GAP = 120 // keep the search pill + chips visible at "full"

function heightsFor(container: number): Record<Snap, number> {
  const full = Math.max(PEEK + 40, container - TOP_GAP)
  const half = Math.min(full - 40, Math.max(330, Math.round(container * 0.5)))
  return { peek: PEEK, half, full }
}

export function SnapSheet({
  snap,
  onSnap,
  onHeight,
  label,
  children,
}: {
  snap: Snap
  onSnap: (s: Snap) => void
  /** Reports the visible height in px (for map padding / attribution). */
  onHeight?: (px: number) => void
  label: string
  children: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [container, setContainer] = useState(700)
  const [dragPx, setDragPx] = useState<number | null>(null)
  const drag = useRef<{ startY: number; startH: number; scale: number; moved: boolean } | null>(null)

  useLayoutEffect(() => {
    const parent = ref.current?.parentElement
    if (!parent) return
    const update = () => setContainer(parent.clientHeight)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(parent)
    return () => ro.disconnect()
  }, [])

  const heights = heightsFor(container)
  const height = dragPx ?? heights[snap]

  useEffect(() => {
    if (dragPx === null) onHeight?.(heights[snap])
  }, [heights[snap], dragPx]) // eslint-disable-line react-hooks/exhaustive-deps

  const onPointerDown = (e: React.PointerEvent) => {
    const el = ref.current
    if (!el) return
    // Pointer deltas are in screen px; the phone frame may be scaled.
    const scale = el.getBoundingClientRect().height / el.offsetHeight || 1
    drag.current = { startY: e.clientY, startH: heights[snap], scale, moved: false }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d) return
    const dy = (e.clientY - d.startY) / d.scale
    if (Math.abs(dy) > 4) d.moved = true
    if (d.moved) setDragPx(Math.max(PEEK - 30, Math.min(heights.full + 20, d.startH - dy)))
  }
  const onPointerUp = (e: React.PointerEvent) => {
    const d = drag.current
    drag.current = null
    if (!d) return
    if (!d.moved) {
      onSnap(ORDER[(ORDER.indexOf(snap) + 1) % ORDER.length])
      return
    }
    const h = d.startH - (e.clientY - d.startY) / d.scale
    const nearest = ORDER.reduce((best, s) => (Math.abs(heights[s] - h) < Math.abs(heights[best] - h) ? s : best), snap)
    setDragPx(null)
    onSnap(nearest)
  }

  return (
    <section
      ref={ref}
      className={cx('snap-sheet', dragPx !== null && 'dragging')}
      style={{ height }}
      aria-label={label}
      data-snap={snap}
    >
      <div
        className="snap-handle"
        role="button"
        tabIndex={0}
        aria-label={`Resize sheet (now ${snap})`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          drag.current = null
          setDragPx(null)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onSnap(ORDER[(ORDER.indexOf(snap) + 1) % ORDER.length])
          }
        }}
      >
        <span className="sheet-handle" />
      </div>
      <div className="snap-body">{children}</div>
    </section>
  )
}
