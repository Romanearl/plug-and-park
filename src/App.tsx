import { lazy, Suspense, type ReactNode } from 'react'
import { DemoBanner } from './components/DemoBanner'
import { PhoneFrame } from './components/PhoneFrame'
import { RequireRole } from './components/RequireRole'
import { TabBar } from './components/TabBar'
import { Router, type Route } from './lib/router'
import { Login } from './screens/auth/Login'
import { Register } from './screens/auth/Register'
import { Verify } from './screens/auth/Verify'
import { ComingSoon } from './screens/ComingSoon'
import { Account } from './screens/driver/Account'
import { MyBookings } from './screens/driver/MyBookings'
import { SpotDetails } from './screens/driver/SpotDetails'
import { Landing } from './screens/Landing'

// Leaflet is heavy — load the map only when the driver opens Explore.
const MapHome = lazy(() => import('./screens/driver/MapHome'))

function Loading() {
  return (
    <div className="screen-view loading-view" role="status" aria-label="Loading">
      <span className="spinner dark" />
    </div>
  )
}

/** Driver area with the tab bar at the bottom. */
function DriverShell({ children }: { children: ReactNode }) {
  return (
    <RequireRole role="driver">
      <div className="screen-view shell">
        <div className="shell-body">
          <Suspense fallback={<Loading />}>{children}</Suspense>
        </div>
        <TabBar />
      </div>
    </RequireRole>
  )
}

const routes: Route[] = [
  { path: '/', render: () => <Landing /> },
  { path: '/register', render: () => <Register /> },
  { path: '/login', render: () => <Login /> },
  { path: '/verify', render: () => <Verify /> },
  {
    path: '/app',
    render: () => (
      <DriverShell>
        <MapHome />
      </DriverShell>
    ),
  },
  {
    path: '/app/bookings',
    render: () => (
      <DriverShell>
        <MyBookings />
      </DriverShell>
    ),
  },
  {
    path: '/app/account',
    render: () => (
      <DriverShell>
        <Account />
      </DriverShell>
    ),
  },
  {
    path: '/app/spot/:id',
    render: ({ id }) => (
      <RequireRole role="driver">
        <SpotDetails key={id} id={id} />
      </RequireRole>
    ),
  },
  {
    path: '/owner',
    render: () => (
      <RequireRole role="owner">
        <ComingSoon
          title="Owner dashboard"
          session="S4 + S6"
          checklist={[
            'Requests with driver rating',
            'Approve / decline',
            'Earnings with 15–20% commission',
            'Availability scheduler',
            'Withdraw to bank / FPS',
          ]}
        />
      </RequireRole>
    ),
  },
]

export function App() {
  return (
    <PhoneFrame banner={<DemoBanner />}>
      <Router routes={routes} fallback={() => <ComingSoon title="Page not found" checklist={[]} />} />
    </PhoneFrame>
  )
}
