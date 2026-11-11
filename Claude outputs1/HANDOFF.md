# Handoff — S3 in progress          Updated: Wed 11 Nov 2026

## Start here (next Claude Code session)
1. Follow the **autonomous run protocol** in `Claude outputs1/CLAUDE.md` §2: read CLAUDE.md (sync root copy), PLAN.md, `PROGRESS.md`, `REVIEW_FIXES.md`.
2. `git status` + `git log --oneline -8`. **Uncommitted S3 work is probably on disk — finish it and commit it, never discard it.**
3. Continue S3 from "S3 status" below, then S4 → S10 (task files exist for all of them).
4. Roman's standing permission: commit + push to `main` without asking (also in CLAUDE.md §2). No destructive git.

## Done so far
- S1 + S2 complete, pushed (commit 1607599). Live: https://romanearl.github.io/plug-and-park/ (Pages = GitHub Actions, deploy green). Repo: https://github.com/Romanearl/plug-and-park
- RF-1..RF-3 done (commit f80b076); `PROGRESS.md` created.
- S3 section 0 committed (4dad60c): `npm run check` (scripts/check.mjs + scripts/lib/server.mjs), leaflet 1.9.4 + react-leaflet 5 + @types/leaflet; screenshots.mjs uses the shared server helper; checks read `PP_BASE`.

## S3 status (uncommitted at time of writing — check `git status`)
Written, typecheck passes:
- `src/lib/availability.ts` (isOpenAt, nextOpening, windowsForDay, openStatus, formatAvailability), `src/lib/pricing.ts` (priceFor, isDcFast, estimateKwh), `src/lib/spots.ts` (filterSpots, sortSpots, districtCounts, DISTRICTS, CHARGER_TYPES), `fmtDate`/`shortName` in util.ts.
- Components: `TabBar`, `RequireRole` (guards), `SnapSheet` (peek/half/full, drag + tap handle), `SpotPhoto` (deterministic SVG scenes), new icons (search, sort, phone, help).
- Screens: `driver/MapHome.tsx` (lazy; pins, chips, district sheet, list/preview sheet, tile fallback), `driver/SpotDetails.tsx`, `driver/Account.tsx`, `driver/MyBookings.tsx` (empty state). `App.tsx` routes: /app, /app/bookings, /app/account, /app/spot/:id (driver guard), /owner (owner guard).
- S3 CSS appended to app.css. S3 scenarios (13 shots) added to `scripts/screenshots.mjs`.

**Decision:** CARTO tiles now return an "API KEY REQUIRED" watermark (2 KB image for every tile). Switched to `https://tile.openstreetmap.org/{z}/{x}/{y}.png` (no key) with a CSS grey filter on `.map .leaflet-tile-pane`. Log this in S3_REPORT "Decisions made"; reviewer should update CLAUDE.md §3.

## S3 remaining
1. `npm run shots -- S3`, self-review every PNG (tile-failure shot 07 was failing before the TileLayer-event fix — re-check).
2. Write `scripts/checks/s3.mjs` covering every S3 "done when" item: 12 pins + filter counts (CCS2=3: Kwun Tong, Kowloon Bay, Wan Chai; CCS2+Under $25=0), district fly, pin/card tap selects (full screen AND framed 1280×720), sheet snaps by drag + tap, list scroll doesn't move map, blocked tiles → banner, details for sp_kwuntong_1 (DC), sp_saikung_1 (AC weekdays), sp_saikung_2 (weekend-only), unit checks for isOpenAt/formatAvailability/priceFor (Node 26 can `import()` the .ts files directly — they only use `import type`), guards for both roles, tab bar hides on details.
3. **Earlier checks need updating for S3 (adapt, don't weaken):** s1 tab-B steps expected the `#/app` placeholder text "Chan Tai Man"/"Signed in as" — now `#/app` is the map; check the name on `#/app/account` instead. s1 "Deep link #/owner after hard refresh" must sign in as owner first (guard). s2 "lands on #/app signed in" must check the name via `#/app/account`. S2 shot `12-app-new-user` likewise. Note these adaptations in the report.
4. `npm run check` all green → S3_REPORT.md → mark S3 done in PROGRESS.md → commit + push → check Actions green + live URL.

## Gotchas
- PowerShell mangles UTF-8 with Get-Content/Set-Content; use Edit tool or Bash/node. Bash heredocs containing `''` inside can break — write a file with the Write tool instead.
- Playwright won't click `aria-disabled` buttons → `click({ force: true })`.
- The empty `repo/` folder: leave it (ignored in .gitignore).
