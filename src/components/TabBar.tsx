import { navigate, usePath } from '../lib/router'
import { cx } from '../lib/util'
import { Icon, type IconName } from './Icon'

const TABS: { to: string; label: string; icon: IconName; match: (p: string) => boolean }[] = [
  { to: '/app', label: 'Explore', icon: 'map', match: (p) => p === '/app' },
  { to: '/app/bookings', label: 'Bookings', icon: 'calendar', match: (p) => p.startsWith('/app/bookings') },
  { to: '/app/account', label: 'Account', icon: 'user', match: (p) => p.startsWith('/app/account') },
]

/** Driver tab bar. Hidden on full-screen flows (spot details, payment, session). */
export function TabBar() {
  const path = usePath()
  return (
    <nav className="tab-bar" aria-label="Main">
      {TABS.map((t) => {
        const active = t.match(path)
        return (
          <button
            key={t.to}
            className={cx('tab', active && 'active')}
            aria-current={active ? 'page' : undefined}
            onClick={() => !active && navigate(t.to, { replace: true })}
          >
            <Icon name={t.icon} size={24} stroke={active ? 2.2 : 1.8} />
            <span>{t.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
