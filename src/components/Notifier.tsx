// In-app notifications (flow diagram: "Driver is notified…" / owner "Receive booking request").
// Watches the shared DB — changes usually come from the other phone via the storage event —
// and slides a toast down from under the demo banner.

import { useEffect, useRef, useState } from 'react'
import type { BookingStatus } from '../data/types'
import { navigate } from '../lib/router'
import { useCurrentUser, useDB } from '../lib/store'
import { Icon } from './Icon'

interface Toast {
  key: number
  text: string
  to: string
  tone: 'green' | 'red' | 'blue'
}

export function Notifier() {
  const db = useDB()
  const user = useCurrentUser()
  const prev = useRef<{ userId: string | null; statuses: Map<string, BookingStatus> }>({ userId: null, statuses: new Map() })
  const [toast, setToast] = useState<Toast | null>(null)

  useEffect(() => {
    const mine = user
      ? db.bookings.filter((b) => (user.role === 'driver' ? b.driverId === user.id : b.ownerId === user.id))
      : []
    const statuses = new Map(mine.map((b) => [b.id, b.status]))
    const before = prev.current
    prev.current = { userId: user?.id ?? null, statuses }
    if (!user || before.userId !== user.id) return // first look at this user's data: no toasts

    let next: Toast | null = null
    for (const b of mine) {
      const was = before.statuses.get(b.id)
      if (user.role === 'driver' && was === 'pending' && b.status === 'confirmed')
        next = { key: Date.now(), text: 'Booking approved — pay to confirm', to: `/app/booking/${b.id}`, tone: 'green' }
      else if (user.role === 'driver' && was === 'pending' && b.status === 'declined')
        next = { key: Date.now(), text: 'Booking declined', to: `/app/booking/${b.id}`, tone: 'red' }
      else if (user.role === 'owner' && was === undefined && b.status === 'pending')
        next = { key: Date.now(), text: 'New booking request', to: '/owner', tone: 'blue' }
    }
    if (next) setToast(next)
  }, [db, user])

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(null), 4500)
    return () => window.clearTimeout(t)
  }, [toast])

  if (!toast) return null
  return (
    <button
      key={toast.key}
      className="notify-toast"
      role="status"
      onClick={() => {
        setToast(null)
        navigate(toast.to)
      }}
    >
      <span className={`notify-icon ${toast.tone}`}>
        <Icon name={toast.tone === 'red' ? 'close' : toast.tone === 'green' ? 'check' : 'bolt'} size={18} stroke={2.5} />
      </span>
      <span style={{ flex: 1 }}>{toast.text}</span>
      <Icon name="chevron" size={18} />
    </button>
  )
}
