<p>
  <img src="public/favicon.svg" width="56" height="56" alt="" align="left" />
  <strong>Plug &amp; Park</strong><br />
  Book idle private EV chargers across Hong Kong by the hour — and earn from yours.
</p>
<br clear="left" />

# Plug & Park

A peer-to-peer EV charging marketplace for Hong Kong. **Drivers** book idle private charging bays by the hour, and **owners** earn money from bays that would otherwise sit empty. The platform takes a 15–20% commission.

**▶ Live demo: https://romanearl.github.io/plug-and-park/**

> 📱 QR code here (added in S10)

> **Demo only.** This is an interactive phone prototype for a university course. Sign-up, verification codes, payments, charging and payouts are all **simulated**. No real money, emails or SMS — and all data stays in your own browser (`localStorage`). Tap the **Demo** strip at the top of any screen for test accounts and a reset button.

## Demo credentials

| What | Value |
|---|---|
| Driver login | `driver@plugpark.demo` |
| Owner login | `owner@plugpark.demo` |
| Password (both) | `Demo1234!` |
| Verification code | `123456` |
| Test card (succeeds) | `4242 4242 4242 4242`, any future expiry, any 3-digit CVC |
| Test card (declined) | `4000 0000 0000 0002` |

## Screenshots

<img src="Claude%20outputs1/screenshots/S1/01-landing.png" width="260" alt="Landing screen" />

## Tech stack

- Vite + React 19 + TypeScript (strict)
- Plain CSS with design tokens (`src/styles/app.css`), no UI kit
- Hash routing (works on GitHub Pages refresh), state in `localStorage` synced live across windows
- Leaflet + OpenStreetMap / CARTO tiles for the map (from S3)
- Playwright for screenshots and smoke tests
- Hosted on GitHub Pages via GitHub Actions

## Run locally

Needs Node.js 20 or newer.

```
npm install                       # install deps
npx playwright install chromium   # one-time, for screenshots
npm run dev                       # http://localhost:5173/plug-and-park/
npm run typecheck                 # tsc --noEmit
npm run build                     # production build → dist/
npm run preview                   # http://localhost:4173/plug-and-park/
npm run shots -- S1               # build + preview + screenshots → "Claude outputs1/screenshots/S1/"
```

## Team

Built by **Group 2, IIMT 2601 (HKU)**.

- [ ] TODO: member names and roles
- Prototype: Roman
