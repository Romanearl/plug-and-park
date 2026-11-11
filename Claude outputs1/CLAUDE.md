# Plug & Park — CLAUDE.md

Read this file at the start of every session. Then read `Claude outputs1/PLAN.md` and the current `Claude outputs1/S*_TASK.md`.

> **Where things live.** The repo root is `C:\Users\kotya\Documents\PlugAndPark`. The folder **`Claude outputs1/`** inside it is the hand-off folder shared with the reviewer:
> - The reviewer writes `CLAUDE.md` (the **master copy**), `PLAN.md` and `S<n>_TASK.md` there.
> - You write `S<n>_REPORT.md` and `screenshots/S<n>/` there.
>
> At the start of every session, if `Claude outputs1/CLAUDE.md` differs from the repo-root `CLAUDE.md`, copy the master over the root copy and mention it in the report. Never edit `PLAN.md`, the task files or the master `CLAUDE.md` yourself; propose changes in your report instead.
>
> The folder name contains a space, so always quote it in shell commands and use `path.join` in scripts.

## 1. What this is

**Plug & Park** is a phone-app prototype for a university course (HKU IIMT 2601, Group 2). It is a peer-to-peer EV charging marketplace for Hong Kong: **drivers** book idle private charging bays by the hour, and **owners** earn money from them. The platform takes a 15–20% commission.

- It is a **demo-ready working skeleton**, not a production app. Auth, OTP, payments, charging and payouts are all **simulated**, but forms use **real validation**.
- It is shown live in a 15-minute class pitch on **Fri 20 Nov 2026**. Classmates are the judges, and the prototype demo is worth **6 of the 10 presentation points**.
- The owner (Roman) works with two assistants: a **planner/reviewer** (Claude in Cowork) writes the task files and reviews reports, and **you (Claude Code)** write all the code.

Source documents (not in the repo): the proposal (one page), three swim-lane flow diagrams (driver booking, owner booking/payout, owner onboarding) and the course project guidelines. `PLAN.md` maps each diagram step to a screen.

## 2. Hard rules — always follow

### Git
1. **Never `git commit` or `git push` without Roman's explicit "yes" in the chat for that specific commit or push.** Prepare the commit (stage the files and propose a message), then ask.
2. **No destructive git commands without asking first**, including `reset`, `restore`, `stash`, `checkout -- <file>`, `clean`, `rebase`, `branch -D`, `push --force` and amending pushed commits. Explain what would be lost, then wait.
3. These are fine without asking: `git status`, `git diff`, `git log`, `git add`, and `git init` (first session only).

### Session protocol
Every session ends with these steps, **then you stop** and don't start the next session's work:
1. `npm run typecheck` and `npm run build` both pass with no errors.
2. `npm run shots -- S<n>` takes **phone-size screenshots (390×844 viewport)** with Playwright of **every screen and state that is new or changed** in this session, plus one 1440×900 shot of the landing page inside the phone frame. They go into **`Claude outputs1/screenshots/S<n>/`**.
3. Write **`Claude outputs1/S<n>_REPORT.md`** using the template in §10.
4. Stop. Tell Roman the report is ready, and ask whether to commit and push.

### Scope
- **Phone only.** Design every screen for a 390×844 phone. **No desktop or tablet layouts, ever.** On wider windows the app renders inside a centred phone frame (§7).
- **No real money, email or SMS.** Never add Stripe, PayPal, Firebase Auth, email/SMS services or analytics. Never collect real card data: the payment form validates a card number but stores only the last 4 digits.
- **No backend and no API keys.** All data lives in the browser (`localStorage`). The only network use is Google Fonts and map tiles.
- **No copyrighted images.** Don't hot-link photos from the web. Until S8, spot photos are generated SVG illustrations; in S8 real photos go in `public/photos/` with credits in the README.
- **Don't copy brand logos.** The visual style is *inspired by* Uber's layout and the 1999–2020 Goldman Sachs blue. Never use their logos, names, wordmarks or fonts.
- Stay inside the current task file. If something is unclear or you think the plan is wrong, **ask instead of guessing**, and list it under "Questions" in the report.

## 3. Stack

| Concern | Choice |
|---|---|
| Build | Vite + React 19 + TypeScript (strict) |
| Styling | Plain CSS with design tokens: `src/styles/app.css` (no Tailwind, no UI kit) |
| Routing | Hash routing (`#/app/spot/3`). Either a tiny custom router in `src/lib/router.tsx` or `react-router-dom`'s `HashRouter`, but never browser-history routing, which breaks on GitHub Pages refresh |
| State | `src/lib/store.ts`: `useSyncExternalStore` over `localStorage`, live-synced across windows (§7). No Redux. |
| Map | Leaflet + react-leaflet, **Carto Positron** tiles (`https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png`, attribution "© OpenStreetMap contributors © CARTO"). No Google Maps, no API key. |
| QR code | A small client-side QR library (e.g. `qrcode`) or an SVG generator. Must work offline. |
| Screenshots / smoke tests | Playwright (dev dependency) |
| Hosting | GitHub Pages via GitHub Actions; public repo `plug-and-park` |

**Developer machine: Windows.** Keep every npm script cross-platform. Use Node scripts, not bash: no `rm -rf`, `&&` chains that assume bash, or `export VAR=`. Use a `.gitattributes` with `* text=auto eol=lf`.

## 4. Commands

```
npm install                 # install deps
npx playwright install chromium   # one-time, for screenshots
npm run dev                 # local dev server (http://localhost:5173/plug-and-park/)
npm run typecheck           # tsc --noEmit
npm run build               # production build → dist/
npm run preview             # serve dist/ locally (http://localhost:4173/plug-and-park/)
npm run shots -- S1         # build + preview + Playwright screenshots → "Claude outputs1/screenshots/S1/"
```

## 5. Folder structure

```
PlugAndPark/                      # repo root (GitHub repo name: plug-and-park)
├─ CLAUDE.md                      # copy of Claude outputs1/CLAUDE.md
├─ README.md
├─ Claude outputs1/               # hand-off folder with the reviewer
│  ├─ CLAUDE.md  PLAN.md  S<n>_TASK.md      # written by the reviewer (read-only for you)
│  ├─ S<n>_REPORT.md                        # written by you at the end of each session
│  └─ screenshots/S<n>/NN-name.png          # written by scripts/screenshots.mjs
├─ index.html                     # loads Inter + Libre Caslon Text from Google Fonts
├─ vite.config.ts                 # base: '/plug-and-park/'
├─ .github/workflows/deploy.yml   # GitHub Pages deploy
├─ public/                        # favicon.svg, photos/ (S8)
├─ scripts/screenshots.mjs        # Playwright screenshot runner (§10)
└─ src/
   ├─ main.tsx  App.tsx           # App = PhoneFrame + DemoBanner + Router
   ├─ styles/app.css              # tokens + component classes (the only stylesheet)
   ├─ lib/       store.ts router.tsx util.ts validation.ts (S2) …
   ├─ data/      types.ts seed.ts
   ├─ components/ PhoneFrame Icon Wordmark DemoBanner BottomSheet TabBar SpotPhoto …
   └─ screens/
      ├─ Landing.tsx  auth/ (Register, Login, Verify)
      ├─ driver/ (MapHome, SpotDetails, BookingSheet, BookingStatus, Payment, Confirmation, Session, Rate, MyBookings, Account)
      └─ owner/  (Dashboard, Requests, Earnings, Availability, Apply)
```

## 6. Design system

### Visual direction
**Uber's layout language with a classic investment-bank blue accent.**
- Black and white base, lots of white space, bold tight sans-serif headings.
- A **full-bleed map** with **bottom sheets** sliding over it (snap points: peek, half, full).
- **Pill buttons** 52px tall and full-width. Primary actions are black with white text.
- The accent is a light "bank blue" (~#7399C6, inspired by the 1999–2020 Goldman Sachs logo). Use it for the selected pin, active states, highlights and the wordmark box. **Text on the blue is always black** (white on it is only 3:1).
- Wordmark: "Plug &" / "Park" stacked in a **serif** (Libre Caslon Text), white on a blue square. Only the wordmark uses serif; everything else is Inter.
- Landing / onboarding screens use a **black** background (Uber-style), and in-app screens use white.

### Tokens (source of truth: `:root` in `src/styles/app.css`)

```css
:root {
  --ink: #000000;  --ink-2: #1f1f1f;  --ink-3: #333333;
  --muted: #6b6b6b;  --muted-2: #8f8f8f;
  --line: #e8e8e8;  --surface: #f3f3f3;  --surface-2: #eeeeee;  --bg: #ffffff;

  --blue: #7399c6;       /* accent FILL — black text on it (7.1:1) */
  --blue-deep: #3e5f8a;  /* blue TEXT/icons on white (6.5:1) */
  --blue-tint: #eaf0f8;  /* soft backgrounds, demo banner */
  --blue-ink: #1c2f4a;   /* dark blue for hero gradients / banner text */

  --success: #0e8345; --success-tint: #e6f4ec;
  --danger:  #d6342c; --danger-tint:  #fdecea;
  --warning: #a35f00; --warning-tint: #fff4e0;

  --font: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
  --font-serif: 'Libre Caslon Text', 'Times New Roman', Georgia, serif;

  --r-sm: 8px; --r-md: 12px; --r-lg: 16px; --r-xl: 24px; --r-pill: 999px;
  --shadow-sheet: 0 -8px 32px rgba(0,0,0,.12);
  --shadow-card: 0 4px 16px rgba(0,0,0,.08);
  --ease: cubic-bezier(.2,.8,.2,1);
  --gutter: 20px;  --tap: 52px;
}
```

### Type scale (Inter)
| Class | Size / line-height / weight | Use |
|---|---|---|
| `.display` | 40 / 1.05 / 800, letter-spacing −0.03em | Landing headline |
| `.h1` | 30 / 1.12 / 800, −0.025em | Screen titles |
| `.h2` | 22 / 1.2 / 700 | Sheet titles, section headers |
| `.h3` | 17 / — / 700 | Card titles |
| body | 16 / 1.45 / 400 | Text |
| `.caption` | 13, `--muted` | Secondary info |
| `.overline` | 12 / 700, uppercase, +0.08em | Small labels |

### Component classes (keep this vocabulary; add new ones in the same style)
`.btn` + `.btn-primary` (black) / `.btn-accent` (blue, black text) / `.btn-inverse` (white on black screens) / `.btn-secondary` (grey) / `.btn-ghost` / `.btn-danger`, plus modifiers `.block` and `.sm` · `.icon-btn` (44px round) · `.field` / `.input` / `.input.invalid` / `.field-error` / `.field-hint` (54px inputs, grey fill, 2px black border on focus, red on error) · `.card` / `.card.flat` · `.sheet` / `.sheet-handle` / `.scrim` · `.chip` / `.chip.active` (black) · `.badge` + `.blue/.green/.red/.amber` · `.list-row` / `.list-icon` · `.row` / `.stack` / `.spacer` / `.divider` · `.page` (20px gutters) · `.scroll` (the screen's scroll container, hidden scrollbar).

### UI rules
- Tap targets are at least 44px. Primary CTAs sit at the bottom of the screen, within thumb reach.
- Copy is sentence case, short and friendly. Money is `HK$25` (helper `hkd()`). Times are 24h; dates are en-GB style ("Thu 12 Nov").
- Every list has an **empty state**, every async step a **loading state**, and every form an **error state**.
- Motion: sheet slide-up about 280ms; `.rise` fade-up on screen entry; respect `prefers-reduced-motion`.
- Icons are inline 24×24 stroke SVGs (`components/Icon.tsx`), with no icon font or CDN.

## 7. Phone frame (phone-only rendering)

`components/PhoneFrame.tsx` wraps the whole app:
- **Window width < 520px** (a real phone): the app fills the screen (`100dvh`) with safe-area padding. No frame, no fake status bar.
- **Window width ≥ 520px** (laptop or projector): the app renders inside a centred **390×844 phone** with a black bezel (12px), 52px screen radius, a fake iOS status bar (live clock, signal, wifi, battery, dynamic island) and a home indicator. The background is a dark navy radial gradient.
  - Scale the whole device with `transform: scale(s)`, where `s = min(1, (innerHeight−40)/868, (innerWidth−40)/414)`, so it always fits a 1280×720 projector.
  - **Leaflet check:** CSS transforms can offset Leaflet's pointer maths. In S3, verify pin taps and drags at scale < 1. If they're wrong, switch the device to CSS `zoom` instead.
  - At ≥ 1000px, show a short caption beside the phone: wordmark, "Interactive phone prototype — IIMT 2601 Group 2", and "Demo only".
- All screens, sheets and modals are positioned **inside** the `.screen` element (`position: absolute` relative to it), never fixed to the browser window.
- Screens with a black top area call `useStatusBar('dark')` so the fake status bar turns white-on-black.

## 8. Data & state

- Types live in `src/data/types.ts`: `User`, `Spot`, `AvailabilityWindow`, `Booking`, `Review`, `Payout` and `DB`.
- Booking status: `pending → confirmed | declined → paid → active → completed` (+ `cancelled`).
- `src/data/seed.ts` exports `createSeed()`: 7 users, 12 Hong Kong spots, 6 bookings and 8 reviews. Dates are **relative to now**, so the demo always looks current.
- `src/lib/store.ts`:
  - Holds the whole `DB` in `localStorage['pp.db']`, versioned. On a version mismatch it re-seeds.
  - `useDB()`, `getDB()`, `updateDB(fn)` (immutable update, then persist and emit).
  - A **`storage` event listener** re-reads the DB when another window changes it. This makes the two-phone presenter view sync live: the owner taps Approve, and the driver's screen updates instantly.
  - The **session (who is logged in) is per window**: `sessionStorage['pp.session.' + (window.name || 'main')]`. That way two iframes (named `driver` and `owner`) can be logged in as different users.
  - `signIn(userId)`, `signOut()`, `useCurrentUser()`, `resetDemo()` (re-seed, sign out, go to `/`).
  - Wrap every storage access in try/catch. The demo must still work in memory if storage is blocked.
- Business rules live in `src/lib/` as pure functions, not inside components: price calculation, commission, slot conflicts (`isSlotAvailable(spot, start, minutes, bookings)`), Luhn check, etc.

### Demo constants (`src/data/seed.ts`)
| | Value |
|---|---|
| Driver account | `driver@plugpark.demo` / `Demo1234!` (Chan Tai Man, Tesla Model Y, rating 4.9) |
| Owner account | `owner@plugpark.demo` / `Demo1234!` (Wong Mei Ling; owns 4 spots incl. Kwun Tong CCS2 and Sai Kung) |
| OTP | `123456` (any other code is rejected) |
| Test card (success) | `4242 4242 4242 4242`, any future expiry, any 3-digit CVC |
| Test card (decline) | `4000 0000 0000 0002`: passes Luhn, but the "gateway" declines it |
| Commission | 18% default (range 15–20%) |
| Price range | HK$20–35 per hour |
| Slot lengths | 15 min, 30 min, 1 h, 2 h |

## 9. Deploy (GitHub Pages)

- Public repo named **`plug-and-park`**, so the live URL is `https://<github-user>.github.io/plug-and-park/`. `vite.config.ts` must have `base: '/plug-and-park/'`.
- `.github/workflows/deploy.yml` builds on every push to `main` and deploys with `actions/upload-pages-artifact` + `actions/deploy-pages`. It runs `npm ci`, so **commit `package-lock.json`**.
- One-time setup by Roman: GitHub → repo → Settings → Pages → Source: **GitHub Actions**.
- Pushing needs Roman's "yes" (§2). After a push, check the Actions run is green and the live URL loads, including a hard refresh on a deep link like `#/app`.

## 10. Screenshots & session report

### `scripts/screenshots.mjs` (`npm run shots -- S<n>`)
- Builds, starts `vite preview`, opens Chromium with **viewport 390×844, deviceScaleFactor 2, isMobile, hasTouch**, and saves PNGs to `Claude outputs1/screenshots/S<n>/NN-screen-name.png`. It creates the folder if needed and overwrites that session's old shots.
- It holds a list of scenarios (route + optional setup such as "sign in as driver", "open demo sheet" or "fill form with invalid email"), so error and empty states are captured too. Add new scenarios each session and keep the old ones, so later sessions can re-shoot everything.
- It also saves `00-framed-1440x900.png`: the landing page at 1440×900, to check the phone frame.
- It fails loudly on page errors or console errors (ignoring font and tile network errors).

### `Claude outputs1/S<n>_REPORT.md` template (keep it short: about one screen of text)

```markdown
# S<n> report — <title>          Date: <date>

## Done
- <feature> — <where> (file paths)

## Not done / partial
- <item> — why, and suggested next step

## Deviations from the task
- <what you did differently and why>

## Checks
- typecheck: pass/fail · build: pass/fail · shots: N screenshots, errors: none/list

## Screenshots (in Claude outputs1/screenshots/S<n>/)
| File | Shows |
|---|---|
| 01-landing.png | Landing, black hero, CTAs |

## Known bugs / risks

## Questions for Roman / the reviewer

## Proposed commit
- Message: "S<n>: <summary>"
- Files: <list or "all changes">
(Waiting for "yes" before committing/pushing.)
```
