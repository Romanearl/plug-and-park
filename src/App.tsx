import { lazy, Suspense, type ReactNode } from 'react'
import { DemoBanner } from './components/DemoBanner'
import { Notifier } from './components/Notifier'
import { StorageNotice } from './components/StorageNotice'
import { PhoneFrame } from './components/PhoneFrame'
import { RequireRole } from './components/RequireRole'
import { TabBar } from './components/TabBar'
import type { Role } from './data/types'
import { Router, usePath, type Route } from './lib/router'
import { Login } from './screens/auth/Login'
import { Register } from './screens/auth/Register'
import { Verify } from './screens/auth/Verify'
import { NotFound } from './screens/NotFound'
import { Account } from './screens/driver/Account'
import { BookingStatus } from './screens/driver/BookingStatus'
import { Confirmation } from './screens/driver/Confirmation'
import { Payment } from './screens/driver/Payment'
import { Rate } from './screens/driver/Rate'
import { Session } from './screens/driver/Session'
import { MyBookings } from './screens/driver/MyBookings'
import { SpotDetails } from './screens/driver/SpotDetails'
import { Landing } from './screens/Landing'
import { Earnings } from './screens/owner/Earnings'
import { FinishSetup } from './screens/owner/FinishSetup'
import { ManageSpot } from './screens/owner/ManageSpot'
import { MySpots } from './screens/owner/MySpots'
import { Requests } from './screens/owner/Requests'
import { Presenter } from './screens/Presenter'

// Leaflet is heavy — load the map only when the driver opens Explore.
const MapHome = lazy(() => import('./screens/driver/MapHome'))
const Apply = lazy(() => import('./screens/owner/Apply'))

function Loading() {
  return (
    <div className="screen-view skeleton" role="status" aria-label="Loading">
      <div className="sk" style={{ height: 52, borderRadius: 999 }} />
      <div className="row" style={{ gap: 8, marginTop: 12 }}>
        {[60, 70, 70, 90].map((w, i) => (
          <div key={i} className="sk" style={{ height: 36, width: w, borderRadius: 999 }} />
        ))}
      </div>
      <div className="sk" style={{ height: 220, marginTop: 20, borderRadius: 16 }} />
      {[0, 1, 2].map((i) => (
        <div key={i} className="row" style={{ gap: 12, marginTop: 16 }}>
          <div className="sk" style={{ width: 72, height: 72 }} />
          <div style={{ flex: 1 }}>
            <div className="sk" style={{ height: 16, width: '80%' }} />
            <div className="sk" style={{ height: 12, width: '55%', marginTop: 8 }} />
          </div>
        </div>
      ))}
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
  { path: '/app/pay/:id', render: ({ id }) => <Full role="driver"><Payment key={id} id={id} /></Full> },
  { path: '/app/confirm/:id', render: ({ id }) => <Full role="driver"><Confirmation key={id} id={id} /></Full> },
  { path: '/app/session/:id', render: ({ id }) => <Full role="driver"><Session key={id} id={id} /></Full> },
  { path: '/app/rate/:id', render: ({ id }) => <Full role="driver"><Rate key={id} id={id} /></Full> },

  // Owner
  { path: '/owner', render: () => <Shell role="owner"><Requests /></Shell> },
  { path: '/owner/earnings', render: () => <Shell role="owner"><Earnings /></Shell> },
  { path: '/owner/spots', render: () => <Shell role="owner"><MySpots /></Shell> },
  { path: '/owner/spots/:id', render: ({ id }) => <Full role="owner"><ManageSpot key={id} id={id} /></Full> },
  { path: '/owner/apply', render: () => <Full role="owner"><Suspense fallback={<Loading />}><Apply /></Suspense></Full> },
  { path: '/owner/apply/:id', render: ({ id }) => <Full role="owner"><Suspense fallback={<Loading />}><Apply key={id} spotId={id} /></Suspense></Full> },
  { path: '/owner/setup/:id', render: ({ id }) => <Full role="owner"><FinishSetup key={id} id={id} /></Full> },
  { path: '/owner/account', render: () => <Shell role="owner"><Account /></Shell> },
]

export function App() {
  const path = usePath()
  // The presenter view draws its own two phones (iframes of this app).
  if (path === '/presenter') return <Presenter />
  return (
    <PhoneFrame banner={<DemoBanner />}>
      <Router routes={routes} fallback={() => <NotFound />} />
      <StorageNotice />
      <Notifier />
    </PhoneFrame>
  )
}
