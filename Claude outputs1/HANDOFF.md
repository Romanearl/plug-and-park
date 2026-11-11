# Handoff — S1–S4 done, S5 next          Updated: Wed 11 Nov 2026

## Start here (next Claude Code session)
1. Follow the **autonomous run protocol** in `Claude outputs1/CLAUDE.md` §2: read CLAUDE.md (sync the root copy), PLAN.md, `PROGRESS.md` and `REVIEW_FIXES.md`.
2. Run `git status` and `git log --oneline -8`. If there's uncommitted work, finish it and commit it. Never discard it.
3. Continue at the first unfinished session in `PROGRESS.md` (S5 → S10; every task file exists).
4. Roman's standing permission is to commit and push to `main` without asking. Destructive git commands are still off-limits.

## State
- Live: https://romanearl.github.io/plug-and-park/ (the presenter view at `#/presenter` was checked live). Repo: https://github.com/Romanearl/plug-and-park. `gh` is logged in as Romanearl.
- **S1, S2, S3 and S4 are done.** Reports are `S1_REPORT.md` (S1 + S2), `S3_REPORT.md` and `S4_REPORT.md`. The last green deploy is be49950.
- `npm run check` = s1 + s2 (62) + s3 (64) + s4 (56), all green.

## Key facts for S5+
- Map tiles: CARTO now needs a key, so we use `tile.openstreetmap.org` (see S3_REPORT). The reviewer should update CLAUDE.md §3.
- DB_VERSION is 2. Bump it whenever the stored data shape changes.
- Booking logic: `src/lib/booking.ts` (pure; `TRANSITIONS`/`canTransition`) and `src/lib/bookingActions.ts` (DB actions via `updateDB`). For S5, add `pay`/`start`/`complete` actions there.
- `#/app/pay/:id` is currently a ComingSoon placeholder in `App.tsx`, as are `#/owner/earnings` and `#/owner/spots` (S6). `MyBookings` is still only an empty state (S5 fills it).
- The status screen (`BookingStatus.tsx`) already renders paid/active/completed minimally; S5 adds Confirmation, Session and Rate.
- `Notifier.tsx` watches the DB for status changes. Add more toasts there if S5/S6 need them.
- Pure functions that import other modules without an extension can't be imported straight into Node. The checks load them through Vite: `createServer({ server: { middlewareMode: true }, appType: 'custom' }).ssrLoadModule('/src/lib/x.ts')` (see s4.mjs).
- Check helpers: a `seen()` helper with a timeout; `click({ force: true })` for `aria-disabled` buttons; pick isolated pins (sp_shatin_1, sp_wanchai_1, sp_taipo_1) because Sai Kung 1/2 and Kwun Tong/Kowloon Bay overlap at zoom 11. A second "user" is a second tab in the same context: set `sessionStorage['pp.session.main']`, then `about:blank` → the real URL.
- Leave the empty `repo/` folder alone (it's in `.gitignore`).
- PowerShell mangles UTF-8; use the Edit/Write tools or node scripts. Bash heredocs with `''` inside can break.
