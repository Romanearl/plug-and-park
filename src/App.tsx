import { lazy, Suspense, type ReactNode } from 'react'
import { DemoBanner } from './components/DemoBanner'
import { Notifier } from './components/Notifier'
import { PhoneFrame } from './components/PhoneFrame'
import { RequireRole } from './components/RequireRole'
import { TabBar } from './components/TabBar'
import type { Role } from './data/types'
import { Router, usePath, type Route } from './lib/router'
import { Login } from './screens/auth/Login'
import { Register } from './screens/auth/Register'
import { Verify } from './screens/auth/Verify'
import { ComingSoon } from './screens/ComingSoon'
import { Account } from './screens/driver/Account'
import { BookingStatus } from './screens/driver/BookingStatus'
import { MyBookings } from './screens/driver/MyBookings'
import { SpotDetails } from './screens/driver/SpotDetails'
import { Landing } from './screens/Landing'
import { Requests } from './screens/owner/Requests'
import { Presenter } from './screens/Presenter'

// Leaflet is heavy — load the map only when the driver opens Explore.
const MapHome = lazy(() => import('./screens/driver/MapHome'))

function Loading() {
  return (
    <div className="screen-view loading-view" role="status" aria-label="Loading">
      <span className="spinner dark" />
    </div>
  )
}

/** Signed-in area with the role's tab bar at the bottom. */
function Shell({ role, children }: { role: Role; children: ReactNode }) {
  return (
    <RequireRole role={role}>
      <div className="screen-view shell">
        <div className="shell-body">
          <Suspense fallback={<Loading />}>{children}</Suspense>
        </div>
        <TabBar role={role} />
      </div>
    </RequireRole>
  )
}

/** Full-screen signed-in page (no tab bar). */
const Full = ({ role, children }: { role: Role; children: ReactNode }) => <RequireRole role={role}>{children}</RequireRole>

const routes: Route[] = [
  { path: '/', render: () => <Landing /> },
  { path: '/register', render: () => <Register /> },
  { path: '/login', render: () => <Login /> },
  { path: '/verify', render: () => <Verify /> },

  // Driver
  { path: '/app', render: () => <Shell role="driver"><MapHome /></Shell> },
  { path: '/app/bookings', render: () => <Shell role="driver"><MyBookings /></Shell> },
  { path: '/app/account', render: () => <Shell role="driver"><Account /></Shell> },
  { path: '/app/spot/:id', render: ({ id }) => <Full role="driver"><SpotDetails key={id} id={id} /></Full> },
  { path: '/app/booking/:id', render: ({ id }) => <Full role="driver"><BookingStatus key={id} id={id} /></Full> },
  {
    path: '/app/pay/:id',
    render: () => (
      <Full role="driver">
        <ComingSoon title="Payment" session="S5" checklist={['Card form with real checks (Luhn, expiry, CVC)', 'Test card 4242… succeeds, 4000…0002 declines', 'QR code + PIN after payment']} />
      </Full>
    ),
  },

  // Owner
  { path: '/owner', render: () => <Shell role="owner"><Requests /></Shell> },
  {
    path: '/owner/earnings',
    render: () => (
      <Shell role="owner">
        <ComingSoon title="Earnings" session="S6" checklist={['Gross, 18% commission, gateway fee, net', 'Per booking and in total', 'Withdraw to FPS / bank']} />
      </Shell>
    ),
  },
  {
    path: '/owner/spots',
    render: () => (
      <Shell role="owner">
        <ComingSoon title="Your spots" session="S6" checklist={['Active toggle per spot', 'Weekly availability scheduler', 'Booking history']} />
      </Shell>
    ),
  },
  { path: '/owner/account', render: () => <Shell role="owner"><Account /></Shell> },
]

export function App() {
  const path = usePath()
  // The presenter view draws its own two phones (iframes of this app).
  if (path === '/presenter') return <Presenter />
  return (
    <PhoneFrame banner={<DemoBanner />}>
      <Router routes={routes} fallback={() => <ComingSoon title="Page not found" checklist={[]} />} />
      <Notifier />
    </PhoneFrame>
  )
}
