# Handoff — S3 nearly done (checks being fixed)          Updated: Wed 11 Nov 2026

## Start here (next Claude Code session)
1. Follow the **autonomous run protocol** in `Claude outputs1/CLAUDE.md` §2: read CLAUDE.md (sync the root copy), PLAN.md, `PROGRESS.md` and `REVIEW_FIXES.md`.
2. Run `git status` and `git log --oneline -8`. If there's uncommitted work, finish it and commit it. Never discard it.
3. Finish S3 (see "S3 remaining" below), then go on to S4 → S10. Every task file already exists in `Claude outputs1/`.
4. Roman's standing permission is to commit and push to `main` without asking (CLAUDE.md §2). Destructive git commands are still off-limits.

## Done
- **S1 + S2** complete and pushed (1607599). Live at https://romanearl.github.io/plug-and-park/ (Pages source: GitHub Actions; the deploy was green). Repo: https://github.com/Romanearl/plug-and-park. `gh` is logged in as Romanearl with the `repo` and `workflow` scopes.
- **RF-1..RF-3** done (f80b076). `PROGRESS.md` has been created. Its S3 line still says "IN PROGRESS"; update it.
- **S3 commits:** 4dad60c (adds the `npm run check` runner `scripts/check.mjs`, the shared `scripts/lib/server.mjs`, and Leaflet 1.9.4 + react-leaflet 5) and c59aac1 (the S3 screens, work in progress).
- **S3 code (all written; typecheck passes):**
  - `src/lib/availability.ts`, `pricing.ts`, `spots.ts`; `fmtDate`/`shortName` in `util.ts`.
  - Components: `TabBar`, `RequireRole`, `SnapSheet` (peek/half/full; drag or tap the handle), `SpotPhoto` (SVG scenes).
  - Screens: `driver/MapHome.tsx` (lazy-loaded), `SpotDetails`, `Account`, `MyBookings`.
  - Guards in `App.tsx` for `/app/*` (driver) and `/owner` (owner).
- `scripts/screenshots.mjs` has 13 S3 scenarios. `npm run shots -- S3` passed and I self-reviewed the shots. Since then I made two fixes and haven't re-shot:
  - the tile-failure banner moved inside the sheet (the full sheet covered it);
  - the attribution is hidden when the sheet is at full height.
- `scripts/checks/s3.mjs` is written and covers every S3 "done when" item. The unit tests import the `.ts` files directly in Node 26.
- s1/s2 checks were **adapted, not weakened**: the signed-in name is now checked on `#/app/account` because `#/app` is the map; the `#/owner` deep link sets an owner session first; and S2 shot 12 goes to Account.

## Uncommitted at the time of writing (commit it!)
- MapHome banner/attribution fixes, the CSS for them, the s3 check, the adapted s1/s2 checks and shots.
- **Bug fix:** `resetDemo()` and Account → Sign out now **navigate first, then `signOut()`**. Otherwise the route guard bounced the window to `#/login` instead of `#/`. This broke the s1 reset check.

## S3 remaining
1. Run `node scripts/check.mjs s1 s3` (it was running when this was written) and fix any FAIL. Open question: the **framed 1280×720 pin tap** in s3 timed out on "Close preview", so a tap at scale < 1 may not select the pin. Debug with `page.mouse.click` at the pin centre. If Leaflet's pointer maths is off under `transform: scale()`, CLAUDE.md §7 says to switch `.device` to CSS `zoom` and re-run the s1 checks. Tip: at zoom 11, overlapping pins (Sai Kung 1/2, Kwun Tong/Kowloon Bay) intercept each other's clicks, so use isolated pins (sp_shatin_1, sp_tuenmun_1, sp_taipo_1).
2. `npm run check` all green → `npm run shots -- S3` (S2 too, since shot 12 changed) → self-review the PNGs.
3. Write `Claude outputs1/S3_REPORT.md` using the CLAUDE.md §10 template. Under **Decisions made**:
   - CARTO tiles now return an "API KEY REQUIRED" watermark (a 2 KB image for every tile), so the map uses `tile.openstreetmap.org` with no key and a CSS grey filter on `.map .leaflet-tile-pane`. The reviewer should update CLAUDE.md §3.
   - "Under $25" means strictly less than 25.
   - Reviews are shown as "First L." for privacy.
   - Spots that have a rating count but no written reviews show "No written reviews yet".
   - Map state (filters and selection) survives a trip to the details screen and back.
   - Under Deviations: the adapted s1/s2 checks.
4. Mark S3 done in `PROGRESS.md`, commit and push. Check that the Actions run is green (`gh run list -L 1`) and that the live `#/app` works.
5. Next: `S4_TASK.md`.

## Gotchas
- PowerShell `Get-Content`/`Set-Content` mangle UTF-8. Use the Edit tool or node scripts. Bash heredocs with quotes in them can break, so write files with the Write tool instead.
- Playwright won't click `aria-disabled` buttons; use `click({ force: true })`.
- `isVisible()` doesn't wait; use a `seen()` helper (`waitFor` with a timeout).
- Leave the empty `repo/` folder alone (it's in `.gitignore`).
