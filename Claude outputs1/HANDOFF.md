# Handoff — ALL DONE (S1–S10). Only REVIEW_FIXES.md items from now on          Updated: Wed 11 Nov 2026

## Start here (next Claude Code session)
1. Follow the **autonomous run protocol** in `Claude outputs1/CLAUDE.md` §2: read CLAUDE.md (sync the root copy), PLAN.md, `PROGRESS.md` and `REVIEW_FIXES.md`.
2. Run `git status` and `git log --oneline -8`. If there's uncommitted work, finish it and commit it. Never discard it.
3. Continue at the first unfinished session in `PROGRESS.md` (There are no sessions left. Do open REVIEW_FIXES.md items only; if none, say so and stop. See FINAL_REPORT.md).
4. Roman's standing permission is to commit and push to `main` without asking. Destructive git commands are still off-limits.

## State
- Live: https://romanearl.github.io/plug-and-park/ (the presenter view at `#/presenter` was checked live). Repo: https://github.com/Romanearl/plug-and-park. `gh` is logged in as Romanearl.
- **S1–S9 are done**, tagged **v1.0-freeze** (d5bb4d7). Code is frozen: only REVIEW_FIXES.md bug fixes.
- `npm run check` = s1–s9 all green (~12 min). `npm run smoke` = demo path (~2 min); `--url <live>`, `--browser webkit|firefox`, `--runs 5`.

## Key facts for S9+
- Map tiles: CARTO now needs a key, so we use `tile.openstreetmap.org` (see S3_REPORT). The reviewer should update CLAUDE.md §3.
- DB_VERSION is 5. Bump it whenever the stored data shape changes. Spots have reviewStatus (only approved + active are public) and optional photos (data URLs or 'sample').
- Booking logic: `src/lib/booking.ts` (pure) and `src/lib/bookingActions.ts` (request/approve/decline/cancel/pay/start/complete/review). Payment rules: `src/lib/payment.ts`. Session maths: `src/lib/session.ts`. Owner earnings: `ownerEarnings()` in `pricing.ts`.
- Owner money: `src/lib/money.ts` (breakdown, ownerBalance, payoutStatus). Owner actions: `src/lib/ownerActions.ts`. Screens: `owner/Earnings`, `MySpots`, `ManageSpot`, `Requests` (with History).
- Checks: background tabs don't run rAF, so call `page.bringToFront()` before interacting with another tab. Switch inputs need `check({ force: true })`. Write test data from the top page, not inside an iframe (a window never gets its own storage event).
- The checks seed bookings by writing `localStorage['pp.db']` directly (see `addBooking` in s5.mjs and `seedBooking` in screenshots.mjs).
- `Notifier.tsx` watches the DB for status changes. Add more toasts there if S5/S6 need them.
- Pure functions that import other modules without an extension can't be imported straight into Node. The checks load them through Vite: `createServer({ server: { middlewareMode: true }, appType: 'custom' }).ssrLoadModule('/src/lib/x.ts')` (see s4.mjs).
- Check helpers: a `seen()` helper with a timeout; `click({ force: true })` for `aria-disabled` buttons; pick isolated pins (sp_shatin_1, sp_wanchai_1, sp_taipo_1) because Sai Kung 1/2 and Kwun Tong/Kowloon Bay overlap at zoom 11. A second "user" is a second tab in the same context: set `sessionStorage['pp.session.main']`, then `about:blank` → the real URL.
- Leave the empty `repo/` folder alone (it's in `.gitignore`).
- PowerShell mangles UTF-8; use the Edit/Write tools or node scripts. Bash heredocs with `''` inside can break.
- Onboarding: `src/lib/applyActions.ts` (draft in sessionStorage, submit, platformApprove/RequestChanges, goLive). Screens: `owner/Apply.tsx` (lazy), `owner/FinishSetup.tsx`. Shared scheduler: `components/ScheduleEditor.tsx`.
- The frame layers use `overflow: clip` (so scrollIntoView can't scroll the whole screen). Keep it.
- Wait for `getByLabel('Digit 1 of 6')` before typing an OTP in checks; poll `location.hash` rather than `waitForURL` after in-app redirects.
- S8 added: route transitions (`.route` wrapper keyed by path in router.tsx), the photo manifest (`public/photos/`), the web app manifest + icons (`scripts/make-icons.mjs`), and a sheet focus trap. `npm run shots -- S8` re-shoots everything into S8/ with a session prefix.
- **Feature freeze starts at S9:** after S9, only bug fixes.
