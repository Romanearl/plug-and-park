# S9 report — Hardening and FEATURE FREEZE          Date: Wed 11 Nov 2026

## Done
- **Smoke test `npm run smoke` (`scripts/smoke.mjs`)** runs the exact demo path on the production build, with two pages in one context. It fails on any console **error or warning** (blocked tiles and fonts excepted):
  1. reset → register a new driver (one email error first) → OTP → map;
  2. CCS2 (3 pins) → Kwun Tong → details;
  3. tomorrow 10:00 → "no longer available" → a suggested time → pending;
  4. the owner sees it live (name and rating) → Approve;
  5. the driver flips without a reload → declined card → 4242 → QR + PIN;
  6. start → progress moves → completes → 5★ → the review count +1;
  7. owner Available HK$117.71 → Withdraw by FPS → Paid;
  8. the same path in the **presenter view** at 1280×720.

  It then runs the S7 checks (the four "No" branches + new-owner onboarding). Options: `--runs N`, `--browser chromium|webkit|firefox`, `--size WxH`, `--url <live>`, `--quick`.
- **Failure drills** (`scripts/checks/s9.mjs`, 18 checks):
  - tiles blocked (the list fallback plus a request still works);
  - fonts blocked (fallback fonts, no horizontal overflow on 4 screens);
  - **fully offline after load** (map list, details, booking and the lazy owner application);
  - **storage blocked** and **storage full** (one notice, the app runs in memory);
  - corrupt `pp.db`; an old-version `pp.db`;
  - **Reset from every driver screen and every owner screen**, including pending, payment, access and an active session, and **during "Processing…"** (nothing gets paid);
  - **F5 on 25 routes** including bad ids;
  - **Back ×6 after paying** (never the card form, never blank, nothing re-submitted);
  - the same user in two windows (no duplicates);
  - **clock edges** (23:50, closed today, a session at 21:59) with no NaN or negative times;
  - **double taps** on Request, Approve, Pay, Start, Submit review and Withdraw → exactly one of each.
- **App fixes from the drills:**
  - **Storage-blocked notice** (`components/StorageNotice.tsx`; `store.ts` marks storage broken when access or a write fails).
  - **Lazy chunks are prefetched 3 s after start-up** (`main.tsx`), so the map and the owner application still open if the venue Wi-Fi drops. The landing page itself still loads no Leaflet.
- **Code health:** the last placeholder (`ComingSoon`) is replaced by a real `NotFound` screen. No `console.log`, `any` or `@ts-ignore`. typecheck is clean.
- **Clean clone:** `git clone` of the GitHub repo into a temporary folder → `npm ci` → `npm run build` → `npm run dev` serves the app → the dev server is stopped and the copy deleted. All OK.
- **Workflow:** the Actions deploy takes **about 35 s**. `npm run check` takes about 12 minutes (well over the 3-minute budget), so the workflow stays build-and-deploy (it already runs `typecheck`).

## Not done / partial
- None.

## Deviations from the task
- **Smoke step 4 "with the driver's rating":** a freshly registered driver has no ratings yet, so the card shows "★ New". The smoke test asserts the name plus a rating marker. The seeded requests show real ratings, e.g. ★ 5.0 (40).
- **Firefox runs without `isMobile`/`hasTouch`** (Firefox doesn't support them), using a plain 390×844 viewport.

## Checks
- typecheck: pass · build: pass · check: s1–s8 green + **s9 18/18** (full run result below) · shots: 12 (S9), errors: none.
- **Smoke, local (Chromium): 5/5 in a row** (119–122 s each, no flakiness, no sleeps added).
- **Smoke, cross-browser:** WebKit ✓ · Firefox ✓ · framed 1280×720 ✓ · framed 1920×1080 ✓ · WebKit framed 1280×720 ✓.
- **Smoke against the live site** (https://romanearl.github.io/plug-and-park/): ✓ on 11 Nov 2026 at 18:54 HKT.
- **Live hard refresh:** `#/app`, `#/app/spot/sp_kwuntong_1` and `#/app/bookings` all render, with no page errors.
- Inputs are 16px or larger (no iOS zoom on focus); `100dvh` and safe areas were checked in WebKit shots.

## Screenshots (in Claude outputs1/screenshots/S9/)
| File | Shows |
|---|---|
| 01-tiles-blocked.png | "Map unavailable — showing list" |
| 02-fonts-blocked-landing.png / 03-fonts-blocked-details.png | Fallback fonts, layout intact |
| 04-storage-blocked-notice.png | The in-memory notice over the map |
| 05-presenter-1280x720.png / 06-presenter-1920x1080.png | Presenter at both sizes |
| 07–12-webkit-*.png | WebKit: landing, map, spot details, payment, session, owner earnings |

## Known bugs / risks
- In WebKit, `about:blank` → app navigations in *test scripts* raise "The operation is insecure" (storage on a blank page). This doesn't affect the app; the shot helpers now force full loads with a query string instead.

## Decisions made
- The prefetch delay is 3 s: late enough that the landing renders first, early enough that it's done before anyone reaches the map.

## Needs a human
- The same real-device and projector steps as in S8_REPORT ("Needs a human"). The smoke test covers WebKit, but not real iOS Safari.

## Freeze
- Tag **`v1.0-freeze`**, pushed. Commit and time are recorded in PROGRESS.md. From now on, only `REVIEW_FIXES.md` bug fixes.

## Commits & deploy
- 2dbf75e, aff9c45, plus "S9: S9 shots + report" (the tagged commit). Deploy: see PROGRESS.md.
