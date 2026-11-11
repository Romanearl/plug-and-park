import { DemoBanner } from './components/DemoBanner'
import { PhoneFrame } from './components/PhoneFrame'
import { Router, type Route } from './lib/router'
import { Login } from './screens/auth/Login'
import { Register } from './screens/auth/Register'
import { Verify } from './screens/auth/Verify'
import { ComingSoon } from './screens/ComingSoon'
import { Landing } from './screens/Landing'

const routes: Route[] = [
  { path: '/', render: () => <Landing /> },
  { path: '/register', render: () => <Register /> },
  { path: '/login', render: () => <Login /> },
  { path: '/verify', render: () => <Verify /> },
  {
    path: '/app',
    render: () => (
      <ComingSoon
        title="Find a charger"
        session="S3"
        checklist={['Full-screen HK map with charger pins', 'District + charger filters', 'List view', 'Bottom-sheet preview']}
      />
    ),
  },
  {
    path: '/owner',
    render: () => (
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
