// Runs app-wide (next to Notifier). Approves due requests of the other owners through
// approveBooking(), so the slot re-check still runs. Timing comes from each booking's
// createdAt, so reloads, other windows and background tabs can't restart or lose it.

import { useEffect } from 'react'
import { approveBooking } from '../lib/bookingActions'
import { autoApproveAt, dueAutoApprovals } from '../lib/autoApprove'
import { getDB, useDB } from '../lib/store'

function runDue() {
  for (const b of dueAutoApprovals(getDB().bookings, Date.now())) approveBooking(b.id) // refuses non-pending: safe across windows
}

export function AutoApprover() {
  const db = useDB()

  useEffect(() => {
    runDue()
    const next = Math.min(...db.bookings.map(autoApproveAt))
    if (!Number.isFinite(next)) return
    const t = window.setTimeout(runDue, Math.max(0, next - Date.now()) + 50)
    return () => window.clearTimeout(t)
  }, [db])

  useEffect(() => {
    const onVisible = () => document.visibilityState === 'visible' && runDue()
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
    }
  }, [])

  return null
}
