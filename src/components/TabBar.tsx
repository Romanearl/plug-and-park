import { navigate, usePath } from '../lib/router'
import { useCurrentUser, useDB } from '../lib/store'
import { cx } from '../lib/util'
import { Icon, type IconName } from './Icon'

interface Tab {
  to: string
  label: string
  icon: IconName
  match: (p: string) => boolean
  badge?: number
}

const DRIVER_TABS: Tab[] = [
  { to: '/app', label: 'Explore', icon: 'map', match: (p) => p === '/app' },
  { to: '/app/bookings', label: 'Bookings', icon: 'calendar', match: (p) => p.startsWith('/app/bookings') },
  { to: '/app/account', label: 'Account', icon: 'user', match: (p) => p.startsWith('/app/account') },
]

const OWNER_TABS: Tab[] = [
  { to: '/owner', label: 'Requests', icon: 'list', match: (p) => p === '/owner' },
  { to: '/owner/earnings', label: 'Earnings', icon: 'wallet', match: (p) => p.startsWith('/owner/earnings') },
  { to: '/owner/spots', label: 'Spots', icon: 'plug', match: (p) => p.startsWith('/owner/spots') },
  { to: '/owner/account', label: 'Account', icon: 'user', match: (p) => p.startsWith('/owner/account') },
]

/** Bottom tab bar for the driver or owner area. Hidden on full-screen flows. */
export function TabBar({ role }: { role: 'driver' | 'owner' }) {
  const path = usePath()
  const db = useDB()
  const user = useCurrentUser()
  const pending = role === 'owner' && user ? db.bookings.filter((b) => b.ownerId === user.id && b.status === 'pending').length : 0
  const tabs = role === 'owner' ? OWNER_TABS.map((t) => (t.to === '/owner' ? { ...t, badge: pending } : t)) : DRIVER_TABS
  return (
    <nav className={cx('tab-bar', role === 'owner' && 'four')} aria-label="Main">
      {tabs.map((t) => {
        const active = t.match(path)
        return (
          <button
            key={t.to}
            className={cx('tab', active && 'active')}
            aria-current={active ? 'page' : undefined}
            onClick={() => !active && navigate(t.to, { replace: true })}
          >
            <span className="tab-icon">
              <Icon name={t.icon} size={24} stroke={active ? 2.2 : 1.8} />
              {!!t.badge && (
                <span className="tab-badge" aria-label={`${t.badge} pending`}>
                  {t.badge}
                </span>
              )}
            </span>
            <span>{t.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
