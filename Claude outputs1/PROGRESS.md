# Progress            Last updated: Thu 12 Nov 2026 12:20 HKT
Repo: https://github.com/Romanearl/plug-and-park (public)
Live URL: https://romanearl.github.io/plug-and-park/      Last green deploy: 8519638 (RF-10)

## Sessions
- [x] S1 Foundation — done 11 Nov, commit 1607599
- [x] S2 Auth — done 11 Nov, commit 1607599
- [x] S3 Discovery — done 11 Nov (report S3_REPORT.md)
- [x] S4 Booking core — done 11 Nov (S4_REPORT.md)
- [x] S5 Driver path — done 11 Nov (S5_REPORT.md)
- [x] S6 Owner side — done 11 Nov (S6_REPORT.md)
- [x] S7 Onboarding + branches — done 11 Nov (S7_REPORT.md)
- [x] S8 Visual polish — done 11 Nov (S8_REPORT.md)
- [x] S9 Hardening — done 11 Nov (S9_REPORT.md) — FEATURE FREEZE, tag v1.0-freeze
- [x] S10 Demo kit — done 11 Nov (FINAL_REPORT.md, demo-kit/)

## Freeze
- Tag: **v1.0-freeze** → commit d5bb4d7 (pushed, unchanged)
- Tag: **v1.1-demo** → commit f4356f3 (pushed; the only later commit corrects a timestamp in this file)
- Live URL: https://romanearl.github.io/plug-and-park/
- Last green smoke test on the live site: Thu 12 Nov 2026 12:20 HKT (Chromium, new demo path + presenter, against commit 8519638)
- All sessions done (S1–S10). From now on: only REVIEW_FIXES.md bug fixes.

## Review fixes done
- RF-1 — repo created + pushed, Pages enabled (GitHub Actions source), deploy green, live URL + deep-link refresh (#/owner) verified with Playwright, no console errors.
- RF-2 — `repo/` added to `.gitignore` (folder left in place).
- RF-3 — no S3 work existed before S3_TASK.md; S3 is built directly from the task file.
- RF-4 (195e532) — map fits all matching pins on load / filter change / district / resize, padded for the top overlay, the sheet and the pin size; zoom capped at 15; pan bounds widened so the fitted view still pans. 9 new checks in s3.mjs (phone + presenter view: every pin fully visible).
- RF-5 (4278b16) — tile filter now `grayscale(1) contrast(0.6) brightness(1.3)` (token `--map-filter`, also used by the mini map). Before/after shots in screenshots/RF/.
- RF-6 (bca1dcc) — "Use declined card" button beside "Use test card" (both small grey, one row, visible without scrolling). 3 new checks in s5.mjs.
- RF-7 (1df7f54) — `freeSlotsNear` returns nearest earlier + two nearest later (demo case 09:00, 12:00, 12:30), filling from the other side. 3 new checks in s4.mjs.
- RF-8 (de57bae) — DEMO_SCRIPT.md: district search → Kwun Tong at 0:15 (chips mentioned, not tapped), suggested 12:00, "Use declined card", new 15-second Spots → Hoi Bun Road → Availability row, total about 4:45, short version updated, diagram-3 line added. smoke.mjs and demo-kit.mjs follow the same path. Screen 05 renamed to `05-map-district-preview` (SCREENS.md updated).
- RF-9 (021fd1a) — HOW_IT_WORKS.md: "Why 18%?" now cites the proposal's 15–20% range; the supply claim is softened with "(team: confirm against the competitors in our report)".
- RF-10 (4cc9d17, 8519638 + this commit) — `npm run check`: 9/9 files pass (s2 62, s3 73, s4 59, s5 65, s6 43, s7 53, s8 24, s9 18; s1 pass). `npm run smoke`: Chromium, WebKit and Firefox pass locally; Chromium passes against the live URL. `node scripts/demo-kit.mjs` re-run: backup-demo.webm (2 min 48 s), driver-flow.webm (1 min 16 s), 25 phone + 25 framed screens, 3 flow images. S3/S4/S5 screenshots re-shot. Deploy run for 8519638 green.
- RF-11 — DEMO_SCRIPT.md 3:55 row: new "what to say" line (also in the short version), flow cell now "Proposal: availability scheduler". README.md and SCREENS.md link only to demo-kit images, which are all regenerated (again in RF-15).
- RF-13 — superseded by RF-15.

## Notes from the RF-4…RF-10 run (12 Nov)
- The spot page (Spots → a bay) has no tab bar, so the demo script goes back with ← before tapping Earnings.
- Kwun Tong has one charger, so the district search zooms to street level (zoom 15) on the single $30 pin.
- At the all-pins view (zoom 10) some pins in the same area still overlap each other (e.g. the two Sai Kung pins); none is clipped by the screen edge, the top overlay or the sheet. Spreading them would need a fractional zoom, which showed white seams between map tiles, so it was not used.
- Pan limits were widened (the old limits blocked vertical panning at zoom 10 and broke the existing "drag pans the map" check).
- Smoke test changes: suggestions are read with `evaluate` because Playwright's `allTextContents()` crashes its Firefox page on that sheet (the app itself is fine in Firefox); two Firefox-only deprecation notes raised inside Leaflet on a pin tap are ignored.
- `scripts/rf-shots.mjs` is new: before/after map shots in `screenshots/RF/`.
- Not re-run: the full `npm run shots` for S1, S2 and S6–S9 (their screens didn't change, apart from the lighter map background where a map is visible).

## Skipped / needs a human
- (none)
