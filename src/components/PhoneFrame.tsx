// Renders the app full-screen on a real phone (<520px) or inside a scaled
// 390×844 phone on a laptop/projector (≥520px). See CLAUDE.md §7.

import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react'
import { cx } from '../lib/util'
import { Wordmark } from './Wordmark'

// ── Status bar theme (screens with a black top call useStatusBar('dark')) ──

type BarTheme = 'light' | 'dark'
let barTheme: BarTheme = 'light'
const barListeners = new Set<() => void>()
function setBarTheme(t: BarTheme) {
  if (t === barTheme) return
  barTheme = t
  barListeners.forEach((l) => l())
}
function subscribeBar(l: () => void) {
  barListeners.add(l)
  return () => {
    barListeners.delete(l)
  }
}
export function useBarTheme(): BarTheme {
  return useSyncExternalStore(subscribeBar, () => barTheme)
}
export function useStatusBar(theme: BarTheme) {
  useEffect(() => {
    setBarTheme(theme)
    return () => setBarTheme('light')
  }, [theme])
}

// ── Viewport ────────────────────────────────────────────────────────────

const DEVICE_W = 414 // 390 + 2×12 bezel
const DEVICE_H = 868 // 844 + 2×12 bezel

function readViewport() {
  return { w: window.innerWidth, h: window.innerHeight }
}

function useViewport() {
  const [vp, setVp] = useState(readViewport)
  useEffect(() => {
    const onResize = () => setVp(readViewport())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return vp
}

function useClock() {
  const fmt = () => new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })
  const [time, setTime] = useState(fmt)
  useEffect(() => {
    const t = window.setInterval(() => setTime(fmt()), 5_000)
    return () => window.clearInterval(t)
  }, [])
  return time
}

function StatusBar() {
  const theme = useBarTheme()
  const time = useClock()
  return (
    <div className={cx('status-bar', theme === 'dark' && 'dark')} aria-hidden>
      <span className="mono">{time}</span>
      <div className="dynamic-island" />
      <div className="status-icons">
        {/* signal */}
        <svg width="18" height="12" viewBox="0 0 18 12" fill="currentColor">
          <rect x="0" y="8" width="3" height="4" rx="1" />
          <rect x="5" y="5.5" width="3" height="6.5" rx="1" />
          <rect x="10" y="3" width="3" height="9" rx="1" />
          <rect x="15" y="0" width="3" height="12" rx="1" />
        </svg>
        {/* wifi */}
        <svg width="16" height="12" viewBox="0 0 16 12" fill="currentColor">
          <path d="M8 2.2c2.4 0 4.6.9 6.2 2.5l1.2-1.2A10.4 10.4 0 0 0 8 .5 10.4 10.4 0 0 0 .6 3.5l1.2 1.2A8.7 8.7 0 0 1 8 2.2Z" />
          <path d="M8 5.6c1.5 0 2.8.6 3.8 1.5L13 5.9A7 7 0 0 0 8 3.9a7 7 0 0 0-5 2l1.2 1.2c1-.9 2.3-1.5 3.8-1.5Z" />
          <path d="M8 9c.6 0 1.1.2 1.5.6L8 11.5 6.5 9.6C6.9 9.2 7.4 9 8 9Z" />
        </svg>
        {/* battery */}
        <svg width="27" height="13" viewBox="0 0 27 13" fill="none">
          <rect x="0.5" y="0.5" width="23" height="12" rx="3.5" stroke="currentColor" opacity=".4" />
          <rect x="2" y="2" width="17" height="9" rx="2" fill="currentColor" />
          <path d="M25 4.5v4c.8-.3 1.3-1.1 1.3-2s-.5-1.7-1.3-2Z" fill="currentColor" opacity=".45" />
        </svg>
      </div>
    </div>
  )
}

function HomeIndicator() {
  const theme = useBarTheme()
  return <div className={cx('home-indicator', theme === 'dark' && 'light')} aria-hidden />
}

/** Wraps the whole app. `banner` sits directly under the status bar; `children` fill the rest. */
export function PhoneFrame({ banner, children }: { banner: ReactNode; children: ReactNode }) {
  const { w, h } = useViewport()
  const theme = useBarTheme()
  const framed = w >= 520

  if (!framed) {
    return (
      <div className="stage full">
        <div className={cx('screen', theme === 'dark' && 'dark-top')}>
          {banner}
          <div className="app-body">{children}</div>
        </div>
      </div>
    )
  }

  const s = Math.min(1, (h - 40) / DEVICE_H, (w - 40) / DEVICE_W)
  return (
    <div className="stage framed">
      <div className="device-box" style={{ width: DEVICE_W * s, height: DEVICE_H * s }}>
        <div className="device" style={{ transform: `scale(${s})` }}>
          <div className={cx('screen', theme === 'dark' && 'dark-top')}>
            <StatusBar />
            {banner}
            <div className="app-body">{children}</div>
            <HomeIndicator />
          </div>
        </div>
      </div>
      {w >= 1000 && (
        <aside className="stage-caption">
          <Wordmark size="md" />
          <div className="title">Plug &amp; Park</div>
          <p>Interactive phone prototype — IIMT 2601, Group 2. Peer-to-peer EV charging in Hong Kong.</p>
          <div className="note">● Demo only</div>
        </aside>
      )}
    </div>
  )
}
