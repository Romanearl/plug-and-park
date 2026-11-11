# S1_TASK — Foundation (+ S2 Auth if it fits)

**Before you start:**
- Read `CLAUDE.md` (rules, stack, design system) and `PLAN.md` (timeline, flow-diagram mapping).
- Follow the git rules: **no commit or push without Roman's "yes"**, and no destructive git commands.
- The machine is **Windows**, so keep every script cross-platform.
- Do **Part A** completely first. Start **Part B** only if every Part A "done when" item passes. If time runs short, stop at a clean point and report.

Appendices A1–A4 at the end hold **reference code written and reviewed by the planner**: types, seed data, utils and the store. Use them as the starting point. You may improve them, but keep the shapes, IDs and demo values, and list any change under "Deviations" in the report.

---

## Part A — S1 Foundation

### A0. Workspace
- The repo root is `C:\Users\kotya\Documents\PlugAndPark`. It already contains the `Claude outputs1/` folder with these docs; **don't move or delete anything in it**.
- Copy `Claude outputs1/CLAUDE.md` to the repo root as `CLAUDE.md`.
- If the root has other unexpected files, list them in the report and leave them alone.

### A1. Project setup
1. In the repo root: `git init` (if needed). Scaffold Vite (React + TS) **into the existing folder without touching `Claude outputs1/`**. If `npm create vite@latest .` complains that the folder isn't empty, scaffold into a temp subfolder and move the files up, or create the files by hand. Remove the Vite demo content (counter, logos, `App.css`, `index.css`).
2. Dependencies: `react`, `react-dom` (19.x). Dev: `typescript`, `@vitejs/plugin-react`, `vite`, `@types/react`, `@types/react-dom`, `playwright`. **Do not** add Leaflet yet (S3) or any UI or CSS framework.
3. `vite.config.ts`: `base: '/plug-and-park/'`, react plugin.
4. `tsconfig`: strict, `noUnusedLocals`, `noUnusedParameters`, `jsx: react-jsx`.
5. `package.json` scripts: `dev`, `build` (`vite build`), `preview`, `typecheck` (`tsc --noEmit -p .`; make sure it covers `src/`), `shots` (`node scripts/screenshots.mjs`).
6. `.gitignore` (node_modules, dist, test-results, playwright-report, .DS_Store) and `.gitattributes` (`* text=auto eol=lf`, `*.png binary`).
7. `index.html`:
   - `lang="en"`, `viewport` with `viewport-fit=cover`, `theme-color #000000`, title "Plug & Park", and a meta description.
   - Google Fonts: **Inter** 400/500/600/700/800 and **Libre Caslon Text** 400/700, with preconnect.
   - Favicon `public/favicon.svg`: a blue (#7399C6) square with a white lightning bolt.

### A2. Design system — `src/styles/app.css`
- The `:root` tokens exactly as in CLAUDE.md §6.
- Base: box-sizing, full-height `html, body, #root`, Inter, antialiasing, no tap highlight.
- Every component class listed in CLAUDE.md §6, with these specs:
  - **Buttons:** 52px tall, pill radius, 17px/600 text, `:active` scale 0.98, disabled at 35% opacity.
  - **Inputs:** 54px tall, `--surface` fill, 12px radius, 2px transparent border that turns black on focus and red when `.invalid`. Labels are 14px/600. Errors are 13px red.
  - **Sheets:** 24px top radius, shadow, 40×5px grey handle. `.scrim` is an absolute overlay at 45% black with sheet slide-up 280ms.
  - **Chips:** 36px tall, grey; `.active` is black with white text.
  - **Badges:** 24px tall, 12px/700, in tint colours.
- Keyframes `fade-in`, `slide-up`, `rise` (fade + 12px up) and `pulse-ring`, plus a `prefers-reduced-motion` override.
- The phone-frame classes for A4.

### A3. Data layer
- `src/data/types.ts`: from **Appendix A1**.
- `src/lib/util.ts`: from **Appendix A3**. It has `id()`, `fakeHash()`, `hkd()`, `addMinutes()`, `dayAt()` and `cx()`.
- `src/data/seed.ts`: from **Appendix A2**. That's 7 users, 12 spots across 10 districts, 6 bookings and 8 reviews; dates are relative to "now", and it exports the demo constants.
- `src/lib/store.ts`: from **Appendix A4**. Persistence, cross-window `storage` sync, per-window session via `window.name`, and `resetDemo()`.
- `src/lib/router.tsx`: a tiny hash router with `usePath()` (`useSyncExternalStore` on `hashchange`), `navigate(to, {replace})`, `back(fallback)`, `matchPath('/app/spot/:id', path)`, `<Router routes fallback>` and `<Link>`. Scroll each screen's `.scroll` container to the top on route change. (`react-router-dom` `HashRouter` is also acceptable; say which you chose.)

### A4. Phone frame — `src/components/PhoneFrame.tsx`
Implement exactly as CLAUDE.md §7 describes:
- **Under 520px:** full screen at `100dvh`, with safe-area insets.
- **520px and wider:** a centred 390×844 screen in a 12px black bezel (64px outer radius, 52px screen radius), on a dark navy radial-gradient stage, scaled with `transform: scale()` to fit (recompute on resize).
- The fake status bar (frame mode only) has:
  - a live `HH:MM` clock (24h)
  - a dynamic island (122×35 black pill)
  - signal, wifi and battery icons drawn in SVG
  - `useStatusBar('dark' | 'light')`, which lets a screen flip the bar to white-on-black
- A home indicator bar at the bottom of the screen (frame mode only).
- At ≥1000px, a caption beside the phone: wordmark (md), "Plug & Park", "Interactive phone prototype — IIMT 2601, Group 2. Peer-to-peer EV charging in Hong Kong.", and a small "Demo only" note.
- Structure: `.stage > .device > .screen > [StatusBar, DemoBanner, .app-body > Router, HomeIndicator]`. Every overlay is absolute **inside** `.screen`.

### A5. Shared components
- `Icon.tsx`: inline 24×24 stroke icons (`bolt, back, close, chevron, check, star, user, car, plug, pin, refresh, key, card, info, mail, lock, clock, map, list, wallet, home, calendar`). The `fill` prop is for stars.
- `Wordmark.tsx`: "Plug &" / "Park" stacked, Libre Caslon Text, white on `--blue`, square. Sizes: `sm` (44px, 11px text), `md` (72px, 17px text), `lg` (112px, 26px text).
- `DemoBanner.tsx`: a 28px strip directly under the status bar on **every** screen, in `--blue-tint` with `--blue-ink` text: "● Demo only — no real payments or emails · <u>Demo</u>". Tapping it opens the **Demo sheet**:
  - The title "Demo controls", a close button, and "Signed in as … / Not signed in" + "data is stored only in this browser".
  - A credentials card: driver login, owner login, password, verification code, test card, declined card.
  - "Sign in as driver" (black) → sign in `u_driver_demo` → `#/app`.
  - "Sign in as charger owner" (blue) → sign in `u_owner_demo` → `#/owner`.
  - "Reset demo" (grey). The first tap turns it into the red "Tap again to wipe all demo data"; the second tap runs `resetDemo()`, then goes to `#/`.

### A6. Screens
**Landing `#/`** (black background, `useStatusBar('dark')`), from top to bottom:
1. Wordmark `sm` at the top left; a translucent badge "📍 Hong Kong" at the top right (use the `pin` icon, not an emoji).
2. A **night-map illustration** (inline SVG about 350×250): dark navy harbour shape, dark grey curved roads, five small blue charger pins with soft glow and staggered `pulse-ring` animation, and one larger blue teardrop pin with a black lightning bolt.
3. Headline `.display` in white: "Charge where / others park." Sub-line at 17px in `#a9b4c2`: "Book idle private EV chargers across Hong Kong by the hour — from HK$20."
4. Three stat tiles (translucent white, 14px radius): "130k+ EVs on HK roads", "~15k public chargers", "8–10h private bays sit idle".
5. Pinned near the bottom: "Get started →" (`.btn-inverse`, white) → `#/register`, and "I already have an account" (`.btn-ghost-light`) → `#/login`.

**Placeholder `ComingSoon` screen** for every route not built yet. It has a back button, a badge "Coming in S<n>", the title, "Signed in as …" if there is a session, a checklist of what's coming, "Back to start", and "Sign out" if signed in. Routes:

| Route | Title | Coming in | Checklist |
|---|---|---|---|
| `#/register` | Create your account | S2 | Choose role; email + password checks; +852 phone; leads to verification |
| `#/login` | Log in | S2 | Email + password with validation; one-tap demo accounts; verification code |
| `#/verify` | Verify your number | S2 | 6-digit code (demo 123456); resend timer; wrong-code error |
| `#/app` | Find a charger | S3 | Full-screen HK map with charger pins; district + charger filters; list view; bottom-sheet preview |
| `#/owner` | Owner dashboard | S4 + S6 | Requests with driver rating; approve/decline; earnings with 15–20% commission; availability scheduler; withdraw to bank/FPS |
| anything else | Page not found | — | — |

### A7. GitHub Pages deploy — `.github/workflows/deploy.yml`
Use this, but check the action versions are current and update them if needed:

```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
  workflow_dispatch:
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: pages
  cancel-in-progress: true
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run build
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

Make sure `package-lock.json` exists. Don't create the GitHub repo or push; Roman decides when (CLAUDE.md §2).

### A8. README.md (skeleton, polished in S10)
- Title with a wordmark-style badge, then a one-line pitch.
- "▶ Live demo: https://<github-user>.github.io/plug-and-park/" (placeholder), plus a "QR code here" placeholder.
- A "Demo only" disclaimer.
- A table of demo credentials.
- Screenshots: link `Claude%20outputs1/screenshots/S1/01-landing.png` for now (URL-encode the space).
- Tech stack, and how to run locally (the commands from CLAUDE.md §4).
- "Built by Group 2, IIMT 2601 (HKU)". Leave member names as a TODO list.

### A9. Screenshot script — `scripts/screenshots.mjs`
As specified in CLAUDE.md §10. Run `npm run build`, start `vite preview` on a fixed port, wait until it's ready, run the scenarios, and always kill the server (Windows-safe). Write to `Claude outputs1/screenshots/<session>/` (path relative to the repo root; mind the space). S1 scenarios:
1. `00-framed-1440x900.png`: landing at 1440×900 (frame and caption visible).
2. `01-landing.png`: landing at 390×844.
3. `02-demo-sheet.png`: landing with the demo sheet open.
4. `03-demo-sheet-reset-confirm.png`: after the first tap on Reset.
5. `04-owner-placeholder.png`: after "Sign in as charger owner" (`#/owner` placeholder shows the owner's name).
6. `05-register-placeholder.png`: `#/register`.
7. `06-framed-1280x720.png`: landing at 1280×720, to check the scaling for a projector.

### Part A — done when
- [ ] `npm run typecheck` and `npm run build` pass with zero errors.
- [ ] At 390×844 the app fills the viewport with no frame; at ≥520px it's framed, centred and scaled to fit at 1280×720.
- [ ] Reloading keeps the data; Reset demo restores the seed; with two tabs open, a change in one shows in the other (test: sign in, reset in tab A, and tab B returns to seed data).
- [ ] The demo sheet signs in as driver or owner and routes correctly; each window keeps its own session.
- [ ] The Landing screen matches the spec above.
- [ ] Deep links like `npm run preview` → `/plug-and-park/#/owner` work after a hard refresh.
- [ ] The deploy workflow, README, screenshots and the report exist.

---

## Part B — S2 Auth (only if Part A is fully done)

Put validation in `src/lib/validation.ts` as pure functions. Each returns either an error string or `null`, so they can be unit-tested and re-used.

| Field | Rule | Error text |
|---|---|---|
| Name | 2–40 chars, letters/spaces/hyphens/apostrophes (allow Chinese characters too) | "Enter your full name" |
| Email | Trimmed and lower-cased; `local@domain.tld` with a TLD of 2+ letters; no spaces | "Enter a valid email, e.g. name@example.com" |
| Email (register) | Must not already exist in the DB | "An account with this email already exists — log in instead" |
| HK phone | `+852` prefix shown as a fixed adornment; 8 digits starting with 4, 5, 6, 7, 8 or 9; display as `9123 4567` | "Enter an 8-digit Hong Kong mobile number" |
| Password | 8+ chars, at least 1 uppercase, 1 lowercase and 1 number | Show a live checklist under the field (each rule ticks green), not one error |
| Confirm password | Equals password | "Passwords don't match" |
| Terms | Must be ticked | "Please accept the terms to continue" |

Validate a field on blur and on submit, then live after its first error. Disable the submit button until the form is valid, **but** still show all errors if submit is tapped. Use a show/hide password toggle. Use correct `type`, `inputMode` and `autoComplete` on every field.

**Register `#/register`** (white screen):
- A back button and the title "Create your account".
- **Role choice:** two large selectable cards side by side. "I drive an EV" (car icon, "Find and book chargers") and "I own a charger" (plug icon, "Earn from your idle bay"). The selected card has a 2px black border and a blue check. The role is pre-selected if the URL has `?role=driver` or `?role=owner`.
- Then the fields: name, email, phone, password + checklist, confirm, terms checkbox ("I agree to the Terms and Privacy Policy — demo").
- CTA "Continue" goes to `#/verify` with a *pending registration* (kept in memory or sessionStorage; **not** added to the DB until the OTP is verified).
- Link: "Already have an account? Log in".

**Login `#/login`:**
- Email and password fields. A wrong combination shows the banner "Email or password is incorrect" (don't reveal which one).
- A "Forgot password?" link opens a small sheet: "Demo only — use Demo1234!".
- Success goes to `#/verify` (2-step verification for every login, as the proposal implies).
- Below the form, a divider "or try a demo account" with two secondary buttons: "Demo driver" and "Demo owner". They **fill** the form (visibly) rather than skipping it, so the presenter can show the validation passing.

**Verify `#/verify`:**
- The title "Enter the 6-digit code", and the sub-line "Sent to +852 •••• 4567" (masked phone of the pending user).
- An info chip: "Demo code: 123456".
- Six separate boxes (`inputMode="numeric"`, `autoComplete="one-time-code"`): auto-advance, backspace goes back, and pasting a 6-digit code fills all of them. It auto-submits when the 6th digit is entered.
- A wrong code shakes the boxes and shows "That code isn't right. Try again." After 5 wrong tries: "Too many attempts — request a new code".
- "Resend code in 0:30" counts down, then becomes the link "Resend code", which resets the timer and attempts and shows a toast "New code sent (demo: 123456)".
- On success: create the user if registering (`verified: true`, `fakeHash` password, `rating: 5`, `ratingCount: 0`), `signIn()`, a short success tick animation, then route: driver → `#/app`, owner → `#/owner`.
- Opening `#/verify` with no pending login or registration redirects to `#/`.

**Sign out:** the placeholder screens already have it. Make sure it clears only this window's session.

**Shots for S2 (add to the script; keep the S1 ones):** register empty; register with errors (invalid email, weak password showing the checklist, mismatch); register valid; duplicate-email error; login error banner; login filled by demo button; verify empty; verify wrong code; verify success, then the `#/app` placeholder showing the new user's name.

### Part B — done when
- [ ] A new driver can register → verify with `123456` → land on `#/app` signed in, and their data survives a reload.
- [ ] Registering with `driver@plugpark.demo` shows the duplicate error.
- [ ] Every rule in the table produces its error. The submit button behaves as specified.
- [ ] Login with the demo accounts works; a wrong password shows the generic error.
- [ ] Every OTP behaviour works: paste, auto-advance, backspace, wrong code, resend timer, 5-attempt limit.
- [ ] Typecheck, build and shots pass. The report covers S1 + S2 (`Claude outputs1/S1_REPORT.md`, with S2 as a second section, and S2 shots in `Claude outputs1/screenshots/S2/`) or is split into `S1_REPORT.md` and `S2_REPORT.md`.

**Then stop** and ask Roman whether to commit and push. Suggested commit messages: `S1: foundation — phone frame, design system, store, landing, deploy workflow` and `S2: auth — register, login, OTP verification`.

---

# Appendices — reference code from the planner

## Appendix A1 — `src/data/types.ts`

```ts
// Core data model for the Plug & Park demo.
// Everything lives in the browser (localStorage) — there is no backend.

export type Role = 'driver' | 'owner'

export type ChargerType = 'Type 2' | 'CCS2' | 'CHAdeMO' | 'GB/T'

export type District =
  | 'Sai Kung'
  | 'Yuen Long'
  | 'Kwun Tong'
  | 'Kowloon Bay'
  | 'Tsuen Wan'
  | 'Kwai Chung'
  | 'Sha Tin'
  | 'Tuen Mun'
  | 'Wan Chai'
  | 'Tai Po'

export interface User {
  id: string
  role: Role
  name: string
  email: string
  /** Fake hash — NEVER a real password store. Demo only. */
  passwordHash: string
  phone?: string
  verified: boolean
  /** Average rating given to this user by the other side (driver rating is shown to owners). */
  rating: number
  ratingCount: number
  vehicle?: string
  createdAt: string
}

/** Weekly availability window. day: 0 = Sunday … 6 = Saturday. Times are "HH:MM", 24h. */
export interface AvailabilityWindow {
  day: number
  start: string
  end: string
}

export interface Spot {
  id: string
  ownerId: string
  title: string
  address: string
  district: District
  /** What kind of property — matches the proposal's rollout plan. */
  propertyType: 'Village house' | 'Industrial building' | 'Commercial bay' | 'Residential estate'
  lat: number
  lng: number
  /** HKD per hour, kept within the proposal's HK$20–35 range. */
  pricePerHour: number
  chargerType: ChargerType
  powerKw: number
  rating: number
  reviewsCount: number
  /** Index into the generated illustration palette (real photos are added later). */
  photoSeed: number
  photoCount: number
  amenities: string[]
  availability: AvailabilityWindow[]
  /** Gate / garage PIN revealed only after payment. */
  accessPin: string
  instructions: string
  active: boolean
}

export type BookingStatus =
  | 'pending' // waiting for owner
  | 'declined' // owner said no
  | 'confirmed' // owner approved, waiting for payment
  | 'paid' // paid, access method issued
  | 'active' // charging in progress
  | 'completed' // finished
  | 'cancelled'

export interface Booking {
  id: string
  spotId: string
  driverId: string
  ownerId: string
  /** ISO timestamp of the slot start. */
  start: string
  durationMinutes: number
  /** Total charged to the driver, HKD. */
  price: number
  /** Platform commission, 0.15–0.20 per the business model. */
  commissionRate: number
  status: BookingStatus
  createdAt: string
  updatedAt: string
  paymentLast4?: string
  pin?: string
  qrPayload?: string
  /** kWh delivered — filled in by the simulated charging session. */
  energyKwh?: number
  reviewed?: boolean
}

export interface Review {
  id: string
  bookingId: string
  spotId: string
  driverId: string
  rating: number
  text: string
  createdAt: string
}

export interface Payout {
  id: string
  ownerId: string
  amount: number
  method: 'FPS' | 'Bank transfer'
  status: 'processing' | 'paid'
  createdAt: string
}

export interface DB {
  version: number
  users: User[]
  spots: Spot[]
  bookings: Booking[]
  reviews: Review[]
  payouts: Payout[]
}
```

## Appendix A2 — `src/data/seed.ts`

```ts
// Seed data for the demo. Loaded on first visit and on "Reset demo".
// Dates are generated relative to *now*, so the demo always looks current.

import type { AvailabilityWindow, Booking, DB, Review, Spot, User } from './types'
import { addMinutes, dayAt, fakeHash } from '../lib/util'

export const DB_VERSION = 1

export const DEMO_PASSWORD = 'Demo1234!'
export const DEMO_OTP = '123456'

export const DEMO_ACCOUNTS = {
  driver: { email: 'driver@plugpark.demo', userId: 'u_driver_demo' },
  owner: { email: 'owner@plugpark.demo', userId: 'u_owner_demo' },
} as const

const WEEKDAYS_9_TO_7: AvailabilityWindow[] = [1, 2, 3, 4, 5].map((day) => ({ day, start: '08:30', end: '19:00' }))
const EVERY_DAY = (start: string, end: string): AvailabilityWindow[] =>
  [0, 1, 2, 3, 4, 5, 6].map((day) => ({ day, start, end }))
const WEEKENDS = (start: string, end: string): AvailabilityWindow[] => [0, 6].map((day) => ({ day, start, end }))

function users(): User[] {
  const now = new Date().toISOString()
  const pw = fakeHash(DEMO_PASSWORD)
  const u = (x: Omit<User, 'passwordHash' | 'verified' | 'createdAt'>): User => ({
    ...x,
    passwordHash: pw,
    verified: true,
    createdAt: now,
  })
  return [
    u({ id: 'u_driver_demo', role: 'driver', name: 'Chan Tai Man', email: 'driver@plugpark.demo', phone: '+852 9123 4567', rating: 4.9, ratingCount: 23, vehicle: 'Tesla Model Y' }),
    u({ id: 'u_driver_2', role: 'driver', name: 'Lam Chi Keung', email: 'lam.ck@plugpark.demo', rating: 4.6, ratingCount: 11, vehicle: 'BYD Atto 3' }),
    u({ id: 'u_driver_3', role: 'driver', name: 'Sarah Ng', email: 'sarah.ng@plugpark.demo', rating: 4.95, ratingCount: 40, vehicle: 'MG4 Electric' }),
    u({ id: 'u_owner_demo', role: 'owner', name: 'Wong Mei Ling', email: 'owner@plugpark.demo', phone: '+852 6123 9876', rating: 4.8, ratingCount: 57 }),
    u({ id: 'u_owner_2', role: 'owner', name: 'Lee Ka Fai', email: 'lee.kf@plugpark.demo', rating: 4.7, ratingCount: 19 }),
    u({ id: 'u_owner_3', role: 'owner', name: 'Kwok Wing (Wing Fat Industrial)', email: 'kwok.w@plugpark.demo', rating: 4.5, ratingCount: 33 }),
    u({ id: 'u_owner_4', role: 'owner', name: 'Ho Siu Ming', email: 'ho.sm@plugpark.demo', rating: 4.9, ratingCount: 8 }),
  ]
}

function spots(): Spot[] {
  return [
    {
      id: 'sp_saikung_1', ownerId: 'u_owner_demo', title: 'Village house garage — Tai Mong Tsai',
      address: 'Tai Mong Tsai Road, Sai Kung', district: 'Sai Kung', propertyType: 'Village house',
      lat: 22.3868, lng: 114.283, pricePerHour: 25, chargerType: 'Type 2', powerKw: 7.4,
      rating: 4.9, reviewsCount: 31, photoSeed: 0, photoCount: 3,
      amenities: ['Covered', 'Gated', 'Near bus stop'], availability: WEEKDAYS_9_TO_7,
      accessPin: '4821', instructions: 'Blue gate on the left. Enter PIN on the keypad, bay is the one with the charger.', active: true,
    },
    {
      id: 'sp_kwuntong_1', ownerId: 'u_owner_demo', title: 'Industrial building bay — Hoi Bun Road',
      address: 'Hoi Bun Road, Kwun Tong', district: 'Kwun Tong', propertyType: 'Industrial building',
      lat: 22.311, lng: 114.221, pricePerHour: 30, chargerType: 'CCS2', powerKw: 50,
      rating: 4.8, reviewsCount: 54, photoSeed: 1, photoCount: 3,
      amenities: ['DC fast', 'Indoor', '24h security'], availability: EVERY_DAY('07:00', '22:00'),
      accessPin: '7350', instructions: 'Car park entrance on Hoi Bun Rd, level 2, bay B-14. Show QR to the guard.', active: true,
    },
    {
      id: 'sp_kowloonbay_1', ownerId: 'u_owner_3', title: 'Warehouse bay — Wang Chiu Road',
      address: 'Wang Chiu Road, Kowloon Bay', district: 'Kowloon Bay', propertyType: 'Industrial building',
      lat: 22.324, lng: 114.209, pricePerHour: 28, chargerType: 'CCS2', powerKw: 60,
      rating: 4.5, reviewsCount: 22, photoSeed: 2, photoCount: 3,
      amenities: ['DC fast', 'Indoor'], availability: WEEKDAYS_9_TO_7,
      accessPin: '1189', instructions: 'Loading dock entrance, turn right, bay 3.', active: true,
    },
    {
      id: 'sp_yuenlong_1', ownerId: 'u_owner_2', title: 'Village house driveway — Kam Tin',
      address: 'Kam Tin Road, Yuen Long', district: 'Yuen Long', propertyType: 'Village house',
      lat: 22.4436, lng: 114.064, pricePerHour: 20, chargerType: 'Type 2', powerKw: 7,
      rating: 4.7, reviewsCount: 12, photoSeed: 3, photoCount: 2,
      amenities: ['Open air', 'Quiet street'], availability: EVERY_DAY('08:00', '20:00'),
      accessPin: '5502', instructions: 'Second house after the temple. Driveway on the right.', active: true,
    },
    {
      id: 'sp_yuenlong_2', ownerId: 'u_owner_2', title: 'Private garage — Nam Sang Wai',
      address: 'Nam Sang Wai Road, Yuen Long', district: 'Yuen Long', propertyType: 'Village house',
      lat: 22.456, lng: 114.03, pricePerHour: 22, chargerType: 'GB/T', powerKw: 7,
      rating: 4.6, reviewsCount: 9, photoSeed: 4, photoCount: 2,
      amenities: ['Covered', 'Gated'], availability: WEEKENDS('09:00', '18:00').concat(WEEKDAYS_9_TO_7),
      accessPin: '3317', instructions: 'Grey roller door. PIN pad on the right.', active: true,
    },
    {
      id: 'sp_tsuenwan_1', ownerId: 'u_owner_3', title: 'Factory car park — Chai Wan Kok',
      address: 'Chai Wan Kok Street, Tsuen Wan', district: 'Tsuen Wan', propertyType: 'Industrial building',
      lat: 22.372, lng: 114.108, pricePerHour: 26, chargerType: 'CHAdeMO', powerKw: 50,
      rating: 4.4, reviewsCount: 17, photoSeed: 5, photoCount: 3,
      amenities: ['DC fast', 'Indoor', 'Toilet'], availability: WEEKDAYS_9_TO_7,
      accessPin: '6604', instructions: 'G/F car park, bays at the back marked “EV”.', active: true,
    },
    {
      id: 'sp_kwaichung_1', ownerId: 'u_owner_4', title: 'Office tower bay — Kwai Fung Crescent',
      address: 'Kwai Fung Crescent, Kwai Chung', district: 'Kwai Chung', propertyType: 'Commercial bay',
      lat: 22.36, lng: 114.13, pricePerHour: 32, chargerType: 'Type 2', powerKw: 11,
      rating: 4.9, reviewsCount: 6, photoSeed: 6, photoCount: 2,
      amenities: ['Indoor', 'Near MTR', '24h security'], availability: WEEKDAYS_9_TO_7,
      accessPin: '9043', instructions: 'Basement 1, bay 27. Show QR at the barrier.', active: true,
    },
    {
      id: 'sp_shatin_1', ownerId: 'u_owner_demo', title: 'Industrial bay — Fo Tan',
      address: 'Au Pui Wan Street, Fo Tan, Sha Tin', district: 'Sha Tin', propertyType: 'Industrial building',
      lat: 22.396, lng: 114.196, pricePerHour: 24, chargerType: 'Type 2', powerKw: 22,
      rating: 4.7, reviewsCount: 28, photoSeed: 7, photoCount: 3,
      amenities: ['Indoor', 'Near MTR'], availability: EVERY_DAY('08:00', '21:00'),
      accessPin: '2268', instructions: 'Car park level 3, bay 3-08.', active: true,
    },
    {
      id: 'sp_tuenmun_1', ownerId: 'u_owner_4', title: 'Village house garage — San Hui',
      address: 'Tsing Shan Tsuen, Tuen Mun', district: 'Tuen Mun', propertyType: 'Village house',
      lat: 22.394, lng: 113.974, pricePerHour: 20, chargerType: 'Type 2', powerKw: 7,
      rating: 4.8, reviewsCount: 14, photoSeed: 8, photoCount: 2,
      amenities: ['Covered', 'Quiet street'], availability: EVERY_DAY('07:30', '19:30'),
      accessPin: '8126', instructions: 'Green gate, garage on the left.', active: true,
    },
    {
      id: 'sp_wanchai_1', ownerId: 'u_owner_3', title: 'Commercial car park bay — Harbour Road',
      address: 'Harbour Road, Wan Chai', district: 'Wan Chai', propertyType: 'Commercial bay',
      lat: 22.28, lng: 114.173, pricePerHour: 35, chargerType: 'CCS2', powerKw: 60,
      rating: 4.6, reviewsCount: 41, photoSeed: 9, photoCount: 3,
      amenities: ['DC fast', 'Indoor', 'Near MTR', '24h security'], availability: EVERY_DAY('07:00', '23:00'),
      accessPin: '4470', instructions: 'Enter via Harbour Road ramp, level B2, bay 112.', active: true,
    },
    {
      id: 'sp_saikung_2', ownerId: 'u_owner_demo', title: 'Seaside house driveway — Pak Sha Wan',
      address: 'Hiram’s Highway, Pak Sha Wan, Sai Kung', district: 'Sai Kung', propertyType: 'Village house',
      lat: 22.3712, lng: 114.2638, pricePerHour: 23, chargerType: 'Type 2', powerKw: 7.4,
      rating: 5.0, reviewsCount: 7, photoSeed: 10, photoCount: 2,
      amenities: ['Open air', 'Sea view'], availability: WEEKENDS('08:00', '20:00'),
      accessPin: '1937', instructions: 'White house opposite the pier. Park nose-in.', active: true,
    },
    {
      id: 'sp_taipo_1', ownerId: 'u_owner_2', title: 'Industrial estate bay — Tai Po',
      address: 'Dai Kwai Street, Tai Po Industrial Estate', district: 'Tai Po', propertyType: 'Industrial building',
      lat: 22.45, lng: 114.168, pricePerHour: 21, chargerType: 'CHAdeMO', powerKw: 40,
      rating: 4.3, reviewsCount: 10, photoSeed: 11, photoCount: 2,
      amenities: ['DC fast', 'Open air'], availability: WEEKDAYS_9_TO_7,
      accessPin: '7781', instructions: 'Gate 2, bays next to the loading area.', active: true,
    },
  ]
}

function bookings(): Booking[] {
  const now = new Date().toISOString()
  const b = (x: Omit<Booking, 'createdAt' | 'updatedAt'>): Booking => ({ ...x, createdAt: now, updatedAt: now })
  return [
    // Already-finished bookings: give the owner dashboard real earnings history.
    b({ id: 'bk_hist_1', spotId: 'sp_kwuntong_1', driverId: 'u_driver_3', ownerId: 'u_owner_demo', start: dayAt(-6, '10:00'), durationMinutes: 60, price: 30, commissionRate: 0.18, status: 'completed', energyKwh: 38.2, reviewed: true, paymentLast4: '4242' }),
    b({ id: 'bk_hist_2', spotId: 'sp_saikung_1', driverId: 'u_driver_2', ownerId: 'u_owner_demo', start: dayAt(-4, '09:30'), durationMinutes: 120, price: 50, commissionRate: 0.18, status: 'completed', energyKwh: 14.1, reviewed: true, paymentLast4: '4242' }),
    b({ id: 'bk_hist_3', spotId: 'sp_shatin_1', driverId: 'u_driver_demo', ownerId: 'u_owner_demo', start: dayAt(-2, '14:00'), durationMinutes: 60, price: 24, commissionRate: 0.18, status: 'completed', energyKwh: 19.5, reviewed: true, paymentLast4: '4242' }),
    b({ id: 'bk_hist_4', spotId: 'sp_kwuntong_1', driverId: 'u_driver_2', ownerId: 'u_owner_demo', start: dayAt(-1, '18:00'), durationMinutes: 30, price: 15, commissionRate: 0.18, status: 'completed', energyKwh: 21.0, reviewed: false, paymentLast4: '4242' }),
    // A request already waiting for the demo owner (so the dashboard is never empty).
    b({ id: 'bk_pending_1', spotId: 'sp_saikung_1', driverId: 'u_driver_3', ownerId: 'u_owner_demo', start: dayAt(1, '15:00'), durationMinutes: 60, price: 25, commissionRate: 0.18, status: 'pending' }),
    // A paid booking that blocks a slot → lets us demo the "spot unavailable" branch.
    b({ id: 'bk_block_1', spotId: 'sp_kwuntong_1', driverId: 'u_driver_2', ownerId: 'u_owner_demo', start: dayAt(1, '10:00'), durationMinutes: 120, price: 60, commissionRate: 0.18, status: 'paid', paymentLast4: '4242', pin: '7350' }),
  ]
}

function reviews(): Review[] {
  const r = (id: string, spotId: string, driverId: string, rating: number, text: string, daysAgo: number): Review => ({
    id, bookingId: '', spotId, driverId, rating, text, createdAt: addMinutes(dayAt(-daysAgo, '12:00'), 0),
  })
  return [
    r('rv_1', 'sp_kwuntong_1', 'u_driver_3', 5, 'Fast charger, easy access, guard was friendly. Will book again.', 6),
    r('rv_2', 'sp_kwuntong_1', 'u_driver_2', 4, 'Great speed. Car park ramp is a bit tight for bigger cars.', 12),
    r('rv_3', 'sp_saikung_1', 'u_driver_2', 5, 'Perfect while hiking in Sai Kung — car was full when I got back.', 4),
    r('rv_4', 'sp_saikung_1', 'u_driver_3', 5, 'Owner gave very clear directions. Quiet and safe.', 20),
    r('rv_5', 'sp_shatin_1', 'u_driver_demo', 5, 'Cheaper than the mall, and no queue.', 2),
    r('rv_6', 'sp_wanchai_1', 'u_driver_3', 4, 'Pricey but super convenient for meetings in Wan Chai.', 9),
    r('rv_7', 'sp_yuenlong_1', 'u_driver_2', 5, 'Lovely owner, slow AC charger but fine for a few hours.', 15),
    r('rv_8', 'sp_tsuenwan_1', 'u_driver_3', 4, 'CHAdeMO works well. Bays are at the very back.', 7),
  ]
}

export function createSeed(): DB {
  return {
    version: DB_VERSION,
    users: users(),
    spots: spots(),
    bookings: bookings(),
    reviews: reviews(),
    payouts: [],
  }
}
```

## Appendix A3 — `src/lib/util.ts`

```ts
// Small helpers shared across the app.

/** Short random id with a readable prefix, e.g. id('bk') → "bk_4f9k2a". */
export function id(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}`
}

/**
 * NOT real security. A deterministic scramble so the demo never stores a
 * plain-text password in localStorage. Real auth is out of scope.
 */
export function fakeHash(password: string): string {
  let h = 5381
  for (let i = 0; i < password.length; i++) h = ((h << 5) + h + password.charCodeAt(i)) >>> 0
  return `demo$${h.toString(16)}`
}

export const hkd = (n: number) =>
  `HK$${n.toLocaleString('en-HK', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`

export function addMinutes(iso: string, minutes: number): string {
  return new Date(new Date(iso).getTime() + minutes * 60_000).toISOString()
}

/** ISO string for `days` from today at HH:MM local time. */
export function dayAt(days: number, hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number)
  const d = new Date()
  d.setDate(d.getDate() + days)
  d.setHours(h, m, 0, 0)
  return d.toISOString()
}

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ')
}
```

## Appendix A4 — `src/lib/store.ts`

```ts
// Tiny persistent store — the app's fake "backend".
//
// • The whole database (users, spots, bookings…) lives in localStorage under DB_KEY.
// • Every tab/window of the app shares it, and the `storage` event keeps them in
//   sync live — so a driver window and an owner window update each other instantly.
// • The logged-in user is per window (sessionStorage keyed by window.name), so two
//   phone frames on one screen can be logged in as different people.

import { useSyncExternalStore } from 'react'
import type { DB, User } from '../data/types'
import { createSeed, DB_VERSION } from '../data/seed'

const DB_KEY = 'pp.db'
const sessionKey = () => `pp.session.${window.name || 'main'}`

type Listener = () => void
const listeners = new Set<Listener>()
const emit = () => listeners.forEach((l) => l())

function safeGet(storage: Storage, key: string): string | null {
  try {
    return storage.getItem(key)
  } catch {
    return null
  }
}
function safeSet(storage: Storage, key: string, value: string | null) {
  try {
    if (value === null) storage.removeItem(key)
    else storage.setItem(key, value)
  } catch {
    /* private mode / blocked storage — the demo still works in memory */
  }
}

function loadDB(): DB {
  const raw = safeGet(localStorage, DB_KEY)
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as DB
      if (parsed.version === DB_VERSION) return parsed
    } catch {
      /* fall through to a fresh seed */
    }
  }
  const fresh = createSeed()
  safeSet(localStorage, DB_KEY, JSON.stringify(fresh))
  return fresh
}

let db: DB = loadDB()
let sessionUserId: string | null = safeGet(sessionStorage, sessionKey())

// Live sync between windows/tabs.
window.addEventListener('storage', (e) => {
  if (e.key === DB_KEY) {
    db = e.newValue ? (JSON.parse(e.newValue) as DB) : loadDB()
    emit()
  }
})

function subscribe(l: Listener) {
  listeners.add(l)
  return () => listeners.delete(l)
}

/** Read the database. Re-renders whenever anything changes (here or in another window). */
export function useDB(): DB {
  return useSyncExternalStore(subscribe, () => db)
}

export function getDB(): DB {
  return db
}

/** Apply an immutable update to the database and persist it. */
export function updateDB(fn: (draft: DB) => DB) {
  db = fn(db)
  safeSet(localStorage, DB_KEY, JSON.stringify(db))
  emit()
}

// ── Session ────────────────────────────────────────────────────────────────

export function useCurrentUser(): User | null {
  const data = useDB()
  const uid = useSyncExternalStore(subscribe, () => sessionUserId)
  return uid ? data.users.find((u) => u.id === uid) ?? null : null
}

export function signIn(userId: string) {
  sessionUserId = userId
  safeSet(sessionStorage, sessionKey(), userId)
  emit()
}

export function signOut() {
  sessionUserId = null
  safeSet(sessionStorage, sessionKey(), null)
  emit()
}

/** Wipe everything back to the seed data. Used by the "Reset demo" button. */
export function resetDemo() {
  db = createSeed()
  safeSet(localStorage, DB_KEY, JSON.stringify(db))
  signOut()
}
```
