# Progress            Last updated: Fri 13 Nov 2026 (code review done)
Repo: https://github.com/Romanearl/plug-and-park (public)
Live URL: https://romanearl.github.io/plug-and-park/      Last green deploy: b3dde82 (RF-15)

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
- Tag: **v1.2-demo** → the commit that adds this line and RF11-15_REPORT.md (pushed)
- Last green smoke test on the live site: Fri 13 Nov 2026 00:56 HKT (Chromium, demo path + presenter, against commit b3dde82, new colours)
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
- RF-12 (962ea2b) — overlapping pins merge into group pins ("2 · $23+": count and lowest price); a tap zooms to separate price pins; selected spot keeps its own pin. Opening map: 6 pins for 12 chargers. 12 new checks in s3.mjs. Label is shorter than the reviewer's example because the wide one failed the two-tap rule (see the report).
- RF-13 — superseded by RF-15.
- RF-14 (ef21ee2) — new colour system: navy base, sky blue = selected/tappable, mint = live; dark map (same tiles, new filter) with "Map style: Dark / Light" in the demo sheet; wordmark navy on blue, icons regenerated; `scripts/checks/contrast.mjs` (61 checks) added to `npm run check`. Before/after pairs in screenshots/RF14/.
- RF-15 (b3dde82 + this commit) — `npm run check` 10/10 files; smoke passes in Chromium, WebKit, Firefox locally and in Chromium on the live URL; every session re-shot (107 + 107 in S8/); demo kit regenerated (backup-demo.webm 2 min 48 s, driver-flow.webm 1 min 16 s, 25 + 25 screens, 3 flows, navy QR slide); DEMO_SCRIPT.md wording updated; report: RF11-15_REPORT.md.

## Notes from the RF-4…RF-10 run (12 Nov)
- The spot page (Spots → a bay) has no tab bar, so the demo script goes back with ← before tapping Earnings.
- Kwun Tong has one charger, so the district search zooms to street level (zoom 15) on the single $30 pin.
- At the all-pins view (zoom 10) some pins in the same area still overlap each other (e.g. the two Sai Kung pins); none is clipped by the screen edge, the top overlay or the sheet. Spreading them would need a fractional zoom, which showed white seams between map tiles, so it was not used.
- Pan limits were widened (the old limits blocked vertical panning at zoom 10 and broke the existing "drag pans the map" check).
- Smoke test changes: suggestions are read with `evaluate` because Playwright's `allTextContents()` crashes its Firefox page on that sheet (the app itself is fine in Firefox); two Firefox-only deprecation notes raised inside Leaflet on a pin tap are ignored.
- `scripts/rf-shots.mjs` is new: before/after map shots in `screenshots/RF/`.
- Not re-run: the full `npm run shots` for S1, S2 and S6–S9 (their screens didn't change, apart from the lighter map background where a map is visible).

## Notes from the RF-11…RF-15 run (12 Nov)
- Roman committed to README.md on GitHub (ddd7d1d, 057dbb6: "no changes allowed to sources or credits without prior approval") and said not to change it. It was merged (698a711) and not edited. Always fetch and merge before pushing.
- Known contrast shortfall: --danger on --danger-tint is 4.19:1 (danger colours are frozen by RF-14). contrast.mjs prints it as KNOWN.
- The QR code stays black on white (themed colours broke decoding in the s5 check).
- Untracked files in "Claude outputs1/" that are not ours and were not committed: three Plug-and-Park-logos-*.pdf and "Claude outputs/CAES9920 2a 1 - scrambled.pptx". Never use `git add -A` on that folder.
- Needs Roman: check the dark map on the classroom projector (fallback: Demo strip → Map style → Light).

## Code review (CODE_REVIEW_TASK.md) — done Fri 13 Nov 2026, tag v1.2.1-review
- Report: `CODE_REVIEW_REPORT.md`. 21 findings: 0 P0, 1 P1, 8 P2, 12 P3; all P1/P2 fixed (CR-01 … CR-12), 9 P3 listed with reasons.
- `npm run check`: 11/11 files, 500 checks (new: `scripts/checks/review.mjs`, 30). Smoke: Chromium, WebKit, Firefox; three time zones; live site. Demo ×10 in the presenter view: 10/10.
- Time-zone rule: always the device's local time.
- New scripts in `scripts/review/`: `edges.mjs`, `monkey.mjs`, `demo10.mjs`, `longrun.mjs`, `wrapdiff.mjs`; `npm run smoke -- --tz <zone>`.
- Needs Roman: real-phone test of the payment form, the projector check, and a decision about the personal email in the public commit history.

## Skipped / needs a human
- (none)
