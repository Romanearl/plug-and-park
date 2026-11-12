import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './styles/app.css'
import './lib/mapStyle' // applies the saved map style (dark / light) before the first render

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Warm the lazy chunks (map, owner application) a few seconds after start-up, so every screen
// still opens if the venue Wi-Fi drops mid-demo. The landing page itself never waits for Leaflet.
window.setTimeout(() => {
  void import('./screens/driver/MapHome').catch(() => {})
  void import('./screens/owner/Apply').catch(() => {})
}, 3000)
