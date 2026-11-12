<p>
  <img src="public/icons/icon-192.png" width="64" height="64" alt="" align="left" />
  <strong>Plug &amp; Park</strong><br />
  Book idle private EV chargers across Hong Kong by the hour — and earn from yours.
</p>
<br clear="left" />

# Plug & Park

**▶ Live demo: https://romanearl.github.io/plug-and-park/** · two-phone presenter view: **[#/presenter](https://romanearl.github.io/plug-and-park/#/presenter)**

<img src="docs/qr-live-demo.png" width="160" alt="QR code to the live demo" />

> **Demo only — no real payments.** This is an interactive phone prototype for a university course (HKU IIMT 2601). Sign-up codes, payments, charging and payouts are all **simulated**. No money moves, no SMS or email is sent, and all data stays in your own browser.

A peer-to-peer EV charging marketplace: **drivers** book idle private charging bays by the hour, and **owners** earn from bays that sit empty 8–10 hours a day. The platform keeps an 18% commission.

## Key screens

<img src="Claude%20outputs1/demo-kit/screens/phone/04-map.png" width="180" alt="Map" /> <img src="Claude%20outputs1/demo-kit/screens/phone/06-spot-details.png" width="180" alt="Spot details" /> <img src="Claude%20outputs1/demo-kit/screens/phone/13-access-qr-pin.png" width="180" alt="QR + PIN" /> <img src="Claude%20outputs1/demo-kit/screens/phone/14-charging.png" width="180" alt="Charging" /> <img src="Claude%20outputs1/demo-kit/screens/phone/17-owner-earnings-breakdown.png" width="180" alt="Owner earnings" />

## Try it in 30 seconds
1. Open the live demo on your phone (scan the QR code) or on a laptop.
2. Tap the blue **Demo** strip at the top → **Sign in as driver** (or **charger owner**).
3. Or log in yourself:

| | |
|---|---|
| Driver login | `driver@plugpark.demo` |
| Owner login | `owner@plugpark.demo` |
| Password | `Demo1234!` |
| Verification code | `123456` |
| Test card (succeeds) | `4242 4242 4242 4242`, any future expiry, any 3-digit CVC |
| Test card (declined) | `4000 0000 0000 0002` |

On a laptop, open the **[presenter view](https://romanearl.github.io/plug-and-park/#/presenter)** to see the driver and owner phones side by side, updating each other live. **Reset demo** puts everything back.

## Flow diagrams → screens
| Diagram step | Screen |
|---|---|
| D1: Search & select a charging spot; platform shows spots with details | [Map](Claude%20outputs1/demo-kit/screens/phone/04-map.png), [spot details](Claude%20outputs1/demo-kit/screens/phone/06-spot-details.png) |
| D1: Select a time slot (15 min – 2 h) → submit a request | [Booking sheet](Claude%20outputs1/demo-kit/screens/phone/07-booking-sheet.png) |
| D1: Charging spot available? **No** → driver notified | [Slot unavailable](Claude%20outputs1/demo-kit/screens/phone/08-slot-unavailable.png) |
| D1/D2: Send request to owner → owner approves? | [Pending](Claude%20outputs1/demo-kit/screens/phone/09-request-pending.png), [owner request](Claude%20outputs1/demo-kit/screens/phone/10-owner-request.png), [approved](Claude%20outputs1/demo-kit/screens/phone/11-booking-approved.png) |
| D1/D2: Payment gateway → successful? (**No** → not confirmed) | [Card declined](Claude%20outputs1/demo-kit/screens/phone/12-payment-declined.png) |
| D1: Provide access method (QR / PIN) | [QR + PIN](Claude%20outputs1/demo-kit/screens/phone/13-access-qr-pin.png) |
| D1: Start charging, live charging data, state of charge | [Charging](Claude%20outputs1/demo-kit/screens/phone/14-charging.png), [complete](Claude%20outputs1/demo-kit/screens/phone/15-session-complete.png) |
| D1: Session complete → rate & review | [Rate](Claude%20outputs1/demo-kit/screens/phone/16-rate.png) |
| D2: Escrow → bill minus 15–20% commission + gateway fee → net payout | [Earnings breakdown](Claude%20outputs1/demo-kit/screens/phone/17-owner-earnings-breakdown.png), [withdraw](Claude%20outputs1/demo-kit/screens/phone/18-withdraw-success.png) |
| D3: Register → application with photos → platform approves? → access code + payment info → spot added | [Welcome](Claude%20outputs1/demo-kit/screens/phone/20-onboarding-welcome.png), [application](Claude%20outputs1/demo-kit/screens/phone/21-onboarding-step1.png), [received](Claude%20outputs1/demo-kit/screens/phone/23-application-received.png), [finish setup](Claude%20outputs1/demo-kit/screens/phone/24-finish-setup.png), [live on map](Claude%20outputs1/demo-kit/screens/phone/25-live-on-driver-map.png) |
| Proposal: availability scheduler; review requests by driver rating | [Scheduler](Claude%20outputs1/demo-kit/screens/phone/19-owner-scheduler.png), [request card with rating](Claude%20outputs1/demo-kit/screens/phone/10-owner-request.png) |

## Simulated vs real
- **Simulated:** SMS codes (always `123456`), card payments and the gateway, the charger's live data (a 1-hour session plays in 25 seconds), bank/FPS payouts, and the platform's approval of new owners (a button in the Demo sheet).
- **Real:** form validation, booking availability and conflict checks, the commission maths (18% + 3% payment fee), live sync between two phones, and the map. More detail is in [HOW_IT_WORKS.md](Claude%20outputs1/demo-kit/HOW_IT_WORKS.md).

## Tech stack
Vite + React 19 + TypeScript (strict), plain CSS with design tokens, a hash router, a `localStorage` store synced across windows, Leaflet with OpenStreetMap tiles, `qrcode`, and Playwright for screenshots, checks and the smoke test. It's hosted on GitHub Pages via GitHub Actions.

## Run locally
Needs Node.js 20 or newer.

```
npm ci                            # install exact dependencies
npm run dev                       # http://localhost:5173/plug-and-park/
npm run build                     # production build → dist/
npm run preview                   # http://localhost:4173/plug-and-park/
npx playwright install chromium   # one-time, for the commands below
npm run check                     # all Playwright checks (about 12 min)
npm run smoke                     # the full demo path end to end (about 2 min)
```

## Folders
```
src/screens/      driver/, owner/, auth/ screens + Landing, Presenter
src/lib/          store (localStorage), router, booking / payment / money / session rules
src/components/   phone frame, sheets, map pieces, icons
scripts/          screenshots, checks/, smoke test, demo kit
Claude outputs1/  plan, task files, reports, screenshots, demo-kit/
```

## Credits
- Map data © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors · map library Leaflet · fonts Inter and Libre Caslon Text (Google Fonts).
- **Photo credits:** see `public/photos/README.md` for how to add photos. *(None yet — all spot images are generated illustrations.)*

## Team
Built by Group 2, IIMT 2601 (HKU)
