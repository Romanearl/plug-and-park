# Plug & Park — CLAUDE.md

Read this file at the start of every run. Then follow the **autonomous run protocol** in §2.

> **Where things live.** The repo root is `C:\Users\kotya\Documents\PlugAndPark`. The folder **`Claude outputs1/`** inside it is the hand-off folder shared with the reviewer:
> - The reviewer writes `CLAUDE.md` (the **master copy**), `PLAN.md`, `S<n>_TASK.md` and `REVIEW_FIXES.md` there.
> - You write `PROGRESS.md`, `S<n>_REPORT.md`, `screenshots/S<n>/`, and (only when needed) `BLOCKED.md` and `FINAL_REPORT.md` there.
>
> At the start of every run, if `Claude outputs1/CLAUDE.md` differs from the repo-root `CLAUDE.md`, copy the master over the root copy and mention it in the report. Never edit `PLAN.md`, the task files, `REVIEW_FIXES.md` or the master `CLAUDE.md` yourself; propose changes in your report instead.
>
> The folder name contains a space, so always quote it in shell commands and use `path.join` in scripts.
>
> **Files whose names start with `ON_HOLD_` are parked tasks. Never act on them, prepare them or list them as pending work.** Start one only when Roman explicitly names that file in the chat and tells you to start it.

## 1. What this is

**Plug & Park** is a phone-app prototype for a university course (HKU IIMT 2601, Group 2). It is a peer-to-peer EV charging marketplace for Hong Kong: **drivers** book idle private charging bays by the hour, and **owners** earn money from them. The platform takes a 15–20% commission.

- It is a **demo-ready working skeleton**, not a production app. Auth, OTP, payments, charging and payouts are all **simulated**, but forms use **real validation**.
- It is shown live in a 15-minute class pitch on **Fri 20 Nov 2026**. Classmates are the judges, and the prototype demo is worth **6 of the 10 presentation points**.
- The owner (Roman) works with two assistants: a **planner/reviewer** (Claude in Cowork) writes the task files and reviews reports, and **you (Claude Code)** write all the code.

Source documents (not in the repo): the proposal (one page), three swim-lane flow diagrams (driver booking, owner booking/payout, owner onboarding) and the course project guidelines. `PLAN.md` maps each diagram step to a screen.

## 2. Hard rules — always follow

### Git (Roman's standing permission, given 11 Nov 2026)
1. **Commit and push to `main` without asking.** This applies only to this project's own repo, `plug-and-park`.
2. **Commit small and often, and push after every commit.** Commit after each task-file section that passes typecheck + build, with the message `S<n>: <what changed>`. Your run can be cut off by the usage limit at any moment, so anything uncommitted is at risk and anything unpushed isn't on the live site.
3. **Never push a broken build.** Run `npm run typecheck` and `npm run build` before each commit.
4. **Destructive git commands are still forbidden without Roman's explicit OK**: `reset`, `restore`, `stash`, `checkout -- <file>`, `clean`, `rebase`, `branch -D`, `push --force`, amending pushed commits. In an unattended run, that means: don't use them. To undo something, edit the files or use `git revert <hash>` (a new commit).
5. Never commit `node_modules`, `dist` or anything secret. Don't change the git config, the remote, the repo's visibility or any other repository.

### Autonomous run protocol
Roman runs you **unattended**: you work until the usage limit stops you, and he restarts you when it resets. Nobody is watching in between, so every run follows the same loop, and all state lives in files and git, never only in the conversation.

**Start of every run (including after a limit reset):**
1. Read this file (sync the root copy from the master), `PLAN.md`, `PROGRESS.md` and `REVIEW_FIXES.md` in `Claude outputs1/`.
2. Run `git status` and `git log --oneline -8`. If there is uncommitted work from an interrupted run, inspect it, finish it and commit it. Never discard it.
3. Do every open item in `REVIEW_FIXES.md` first. An item is open if its ID isn't listed under "Review fixes done" in `PROGRESS.md`.
4. Continue at the first session in `PROGRESS.md` that isn't marked done.

**Loop for each session S<n>:**
1. Read `Claude outputs1/S<n>_TASK.md`. If the session was built before its task file existed, do a **gap pass**: check the code against every item and "done when" line, and build what's missing.
2. Build section by section. After each section: typecheck, build, commit, push, and update `PROGRESS.md`.
3. Add `scripts/checks/s<n>.mjs` with Playwright checks for every "done when" item. `npm run check` (all sessions' checks) must pass. **Never delete or weaken an earlier check to make it pass**; fix the regression instead.
4. Run `npm run shots -- S<n>`: phone-size screenshots (**390×844 viewport**) of every new or changed screen and state, into `Claude outputs1/screenshots/S<n>/`.
5. **Self-review the screenshots.** Open each new PNG and look at it. Fix and re-shoot if you see any of these:
   - clipped or overflowing text, or horizontal scroll
   - content hidden under the status bar, demo banner, tab bar or home indicator
   - elements off the 20px gutters or misaligned with their neighbours
   - text that fails contrast (white on `--blue` is not allowed)
   - a screen that looks empty or unfinished, or an unstyled default browser control
   - anything that doesn't look like the same app as the earlier screens
6. Write `Claude outputs1/S<n>_REPORT.md` (template in §10), mark the session done in `PROGRESS.md`, commit and push.
7. Check the deploy: the GitHub Actions run is green and the live URL loads (§9). If it's red, fix that before anything else.
8. **Go straight to the next session.** Don't wait for Roman or the reviewer.

**Decisions.** Don't stop to ask questions. Choose the option that best serves a smooth 5-minute live demo and matches the flow diagrams (`PLAN.md`), then log it under "Decisions made" in the report.

**Stuck rule.** If one item still fails after 3 real attempts, stop working on it: back out the partial work by editing files (not with git reset), log it in `PROGRESS.md` as skipped with what you tried, and move on. If time is short, follow the cut order in `PLAN.md`.

**Stop conditions.**
- **S10 is done.** Write `Claude outputs1/FINAL_REPORT.md` and stop. **Don't invent new features, refactors or "improvements" to use up remaining usage.** From then on, a run only handles open `REVIEW_FIXES.md` items; if there are none, say so and stop.
- **Feature freeze after S9.** S10 is the demo kit only: docs, screenshots, video. After S9, the only code changes allowed are bug fixes.
- **A hard blocker only Roman can clear** (GitHub login missing, a permission prompt, a need for destructive git, anything involving money or credentials). Write `Claude outputs1/BLOCKED.md` saying exactly what you need, continue with any work that isn't blocked, and stop if there is none.

**`Claude outputs1/PROGRESS.md`** is your memory between runs. Create it if it's missing and keep it current during the session, not only at the end:

```markdown
# Progress            Last updated: <date time>
Live URL: https://<user>.github.io/plug-and-park/      Last green deploy: <commit>

## Sessions
- [x] S1 Foundation — done <date>, commit <hash>
- [ ] S3 Discovery — IN PROGRESS: sections 1–3 done, working on 4 (spot details)

## Review fixes done
- RF-1 (<hash>)

## Skipped / needs a human
- <item> — what was tried, why skipped
```

### Scope
- **Phone only.** Design every screen for a 390×844 phone. **No desktop or tablet layouts, ever.** On wider windows the app renders inside a centred phone frame (§7).
- **No real money, email or SMS.** Never add Stripe, PayPal, Firebase Auth, email/SMS services or analytics. Never collect real card data: the payment form validates a card number but stores only the last 4 digits.
- **No backend and no API keys.** All data lives in the browser (`localStorage`). The only network use is Google Fonts and map tiles.
- **No copyrighted images.** Don't hot-link photos from the web. Until S8, spot photos are generated SVG illustrations; in S8 real photos go in `public/photos/` with credits in the README.
- **Don't copy brand logos.** The visual style is *inspired by* Uber's layout and the 1999–2020 Goldman Sachs blue. Never use their logos, names, wordmarks or fonts.
- Stay inside the task files. If something is unclear, decide (see "Decisions" above) and log it. If you think the plan itself is wrong, say so in the report, but build what the task file says.
- **Quality over speed.** There's no bonus for finishing early. A smaller app where every screen works and looks finished beats a bigger one with rough edges.

## 3. Stack

| Concern | Choice |
|---|---|
| Build | Vite + React 19 + TypeScript (strict) |
| Styling | Plain CSS with design tokens: `src/styles/app.css` (no Tailwind, no UI kit) |
| Routing | Hash routing (`#/app/spot/3`). Either a tiny custom router in `src/lib/router.tsx` or `react-router-dom`'s `HashRouter`, but never browser-history routing, which breaks on GitHub Pages refresh |
| State | `src/lib/store.ts`: `useSyncExternalStore` over `localStorage`, live-synced across windows (§7). No Redux. |
| Map | Leaflet + react-leaflet with **OpenStreetMap standard tiles** (attribution "© OpenStreetMap contributors"), darkened with a CSS filter (`--map-filter`). CARTO tiles now need an API key, so they aren't used. No Google Maps, no API key. |
| QR code | A small client-side QR library (e.g. `qrcode`) or an SVG generator. Must work offline. |
| Screenshots / smoke tests | Playwright (dev dependency) |
| Hosting | GitHub Pages via GitHub Actions; public repo `plug-and-park` |

**Versions:** keep the current stable versions already installed (React 19, Vite 8, TypeScript 7, Node 26, Playwright). Don't downgrade, and don't upgrade a major version mid-project.

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
npm run check               # build + preview + run every scripts/checks/s*.mjs (add this script in S3)
npm run smoke               # full happy-path test (S9)
```

## 5. Folder structure

```
PlugAndPark/                      # repo root (GitHub repo name: plug-and-park)
├─ CLAUDE.md                      # copy of Claude outputs1/CLAUDE.md
├─ README.md
├─ Claude outputs1/               # hand-off folder with the reviewer
│  ├─ CLAUDE.md  PLAN.md  S<n>_TASK.md  REVIEW_FIXES.md   # written by the reviewer (read-only for you)
│  ├─ PROGRESS.md  S<n>_REPORT.md           # written by you
│  └─ screenshots/S<n>/NN-name.png          # written by scripts/screenshots.mjs
├─ index.html                     # loads Inter + Libre Caslon Text from Google Fonts
├─ vite.config.ts                 # base: '/plug-and-park/'
├─ .github/workflows/deploy.yml   # GitHub Pages deploy
├─ public/                        # favicon.svg, photos/ (S8)
├─ scripts/screenshots.mjs        # Playwright screenshot runner (§10)
├─ scripts/checks/s<n>.mjs        # Playwright checks, one file per session
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
**Uber's layout language on a navy base, with two accents: sky blue and mint.** (Colour system changed on 12 Nov 2026; see RF-14 in `REVIEW_FIXES.md`.)
- **Navy and white base**, lots of white space, bold tight sans-serif headings. Navy (`--ink`) replaces pure black everywhere except the phone frame hardware.
- A **full-bleed dark map** with white **bottom sheets** sliding over it (snap points: peek, half, full).
- **Pill buttons** 52px tall and full-width. Primary actions are navy with white text.
- **Sky blue means "selected" or "tappable":** selected chips, slots and cards, the active tab, links, the sheet handle, finished steps, the wordmark box.
- **Mint means "live":** map pins, availability and status badges, charging progress, success moments, money coming in.
- **Neither accent carries white text, and neither is used as text on a light background.** Text on `--blue` or `--mint` is navy; accent-coloured text on white uses `--blue-deep` or `--mint-deep`.
- Wordmark: "Plug &" / "Park" stacked in a **serif** (Libre Caslon Text), navy on a sky-blue square. Only the wordmark uses serif; everything else is Inter. Roman is designing a final logo separately, so keep it easy to swap.
- Landing, the charging session and the owner's balance card use a **navy** background; other in-app screens use white.

### Tokens (source of truth: `:root` in `src/styles/app.css`)

```css
:root {
  --ink: #102A43;  --ink-2: #1B3A57;  --ink-3: #2A4A68;   /* Midnight Navy */
  --muted: #55657A;  --muted-2: #7C8A9A;                  /* muted-2: large or non-essential text only */
  --line: #E1E7ED;  --surface: #F4F7FA;  --surface-2: #E9EEF3;  --bg: #FFFFFF;

  --blue: #68A8E8;       /* selected FILL — navy text on it (5.8:1) */
  --blue-deep: #2B66A8;  /* blue TEXT/icons/focus on light backgrounds (5.9:1) */
  --blue-tint: #E8F1FC;  /* soft backgrounds, demo banner */
  --blue-ink: #102A43;

  --mint: #4EE4B6;       /* live FILL — navy text on it (9.1:1); as-is on navy (9.1:1) */
  --mint-deep: #0A6B50;  /* mint-family TEXT/icons on light backgrounds (6.5:1) */
  --mint-tint: #E3FBF3;

  --success: #0A6B50; --success-tint: #E3FBF3;   /* success belongs to the mint family */
  --danger:  #D6342C; --danger-tint:  #FDECEA;
  --warning: #A35F00; --warning-tint: #FFF4E0;

  --font: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
  --font-serif: 'Libre Caslon Text', 'Times New Roman', Georgia, serif;

  --r-sm: 8px; --r-md: 12px; --r-lg: 16px; --r-xl: 24px; --r-pill: 999px;
  --shadow-sheet: 0 -8px 32px rgba(0,0,0,.12);
  --shadow-card: 0 4px 16px rgba(0,0,0,.08);
  --ease: cubic-bezier(.2,.8,.2,1);
  --gutter: 20px;  --tap: 52px;
  --map-filter: /* dark map; a light variant is switchable from the demo sheet */;
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
`.btn` + `.btn-primary` (navy) / `.btn-accent` (blue, navy text) / `.btn-inverse` (white on navy screens) / `.btn-secondary` (grey) / `.btn-ghost` / `.btn-danger`, plus modifiers `.block` and `.sm` · `.icon-btn` (44px round) · `.field` / `.input` / `.input.invalid` / `.field-error` / `.field-hint` (54px inputs, grey fill, 2px `--blue-deep` border on focus, red on error) · `.card` / `.card.flat` · `.sheet` / `.sheet-handle` / `.scrim` · `.chip` / `.chip.active` (sky blue, navy text) · `.badge` + `.blue/.green/.red/.amber` (`.green` is the mint family) · `.list-row` / `.list-icon` · `.row` / `.stack` / `.spacer` / `.divider` · `.page` (20px gutters) · `.scroll` (the screen's scroll container, hidden scrollbar).

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
- Screens with a navy top area call `useStatusBar('dark')` so the fake status bar turns white-on-navy.

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
- **First push (if the repo doesn't exist yet):** check `gh auth status`. If logged in, create the repo with `gh repo create plug-and-park --public --source . --remote origin --push`, then enable Pages with GitHub Actions as the source (`gh api -X POST repos/{owner}/plug-and-park/pages -f build_type=workflow`). Put the real live URL in `README.md` and `PROGRESS.md`. If `gh` isn't logged in, that's a hard blocker: write `BLOCKED.md` and keep working locally with commits but no push.
- After every push, check the Actions run is green (`gh run list --limit 1`) and the live URL loads, including a hard refresh on a deep link like `#/app`.

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
- typecheck: pass/fail · build: pass/fail · check: N/N pass · shots: N screenshots, errors: none/list
- Screenshot self-review: done, <what you fixed>

## Screenshots (in Claude outputs1/screenshots/S<n>/)
| File | Shows |
|---|---|
| 01-landing.png | Landing, navy hero, CTAs |

## Known bugs / risks

## Decisions made
- <choice> — why

## Needs a human (Roman or the reviewer)
- <things you couldn't verify yourself, e.g. a real-phone test>

## Commits & deploy
- Commits: <hash> "<message>", …
- Pushed: yes/no · Actions run: green/red · Live URL checked: yes/no
```
