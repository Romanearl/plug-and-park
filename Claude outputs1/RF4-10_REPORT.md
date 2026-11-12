# RF-4 to RF-10 report — review fixes after S3–S10          Date: Thu 12 Nov 2026

## Done
- **RF-4 map fit** — the map fits every matching pin on load, on filter or district change, on Clear filters and on resize, padded for the top overlay, the sheet and the pin size; a single result stops at zoom 15 (`src/screens/driver/MapHome.tsx`).
- **RF-5 base map** — tile filter is now `grayscale(1) contrast(0.6) brightness(1.3)`, token `--map-filter`, used by the main map and the mini map (`src/styles/app.css`). Tile provider unchanged.
- **RF-6 declined card** — "Use declined card" beside "Use test card", one row, both small grey, visible without scrolling (`src/screens/driver/Payment.tsx`).
- **RF-7 suggestions** — `freeSlotsNear` returns the nearest earlier slot and the two nearest later ones, filling from the other side if one is short. Demo case: 09:00, 12:00, 12:30 (`src/lib/booking.ts`).
- **RF-8 demo script** — district search → Kwun Tong at 0:15 (chips mentioned, not tapped), suggested 12:00, "Use declined card", new Spots → Hoi Bun Road → Availability row, short version updated, diagram 3 line added. Total about 4:45 (`demo-kit/DEMO_SCRIPT.md`, `scripts/smoke.mjs`, `scripts/demo-kit.mjs`).
- **RF-9 claims** — "Why 18%?" cites the proposal's 15–20% range; the supply claim is softened with "(team: confirm against the competitors in our report)" (`demo-kit/HOW_IT_WORKS.md`).
- **RF-10 re-verify** — checks, three-browser smoke, demo kit regenerated, live smoke, tag `v1.1-demo`.

## Not done / partial
- Full `npm run shots` for S1, S2 and S6–S9 was not re-run. Any of those screenshots that show a map still have the old, darker background. Next step: `npm run shots -- S6` etc. if you want them consistent.
- Pins in the same area still overlap each other at the all-Hong-Kong view (e.g. the two Sai Kung pins). None is clipped by the screen edge, the top overlay or the sheet.

## Deviations from the task
- **Withdraw row has one extra tap.** The spot page has no tab bar, so after the Availability step the script says ← then Earnings → Withdraw.
- **Pan limits widened** (`HK_BOUNDS`). The old limits blocked vertical panning at the fitted zoom 10 and failed the existing "drag pans the map" check.
- **Screen 05 renamed** to `05-map-district-preview` (was `05-map-ccs2-preview`); `SCREENS.md` updated.
- **Smoke test, Firefox only:** suggestions are read with `evaluate` because Playwright's `allTextContents()` crashed its Firefox page on that sheet (the app itself was alive and showed the right times); two Firefox deprecation notes raised inside Leaflet on a pin tap are now ignored.
- `FINAL_REPORT.md`: only the two video lengths and the backup-video description were updated.

## Checks
- typecheck: pass · build: pass · check: 9/9 files pass (s2 62, s3 73, s4 59, s5 65, s6 43, s7 53, s8 24, s9 18; s1 pass)
- New checks: 9 in `s3.mjs` (every pin fully visible on load, per filter, per district, after re-seed, in the presenter view; zoom cap), 3 in `s4.mjs`, 3 in `s5.mjs`. No earlier check was removed or weakened.
- smoke: Chromium, WebKit, Firefox pass locally · Chromium passes against the live URL (12:20 HKT, commit 8519638)
- shots: S3 (13), S4 (14), S5 (16) re-shot, no errors · demo kit: 2 videos, 25 phone + 25 framed screens, 3 flow images
- Screenshot self-review: done. Fixed: "Use declined card" was below the fold as a full-width button, so both card buttons now share one row. Rejected: a fractional zoom that spread the pins but showed white seams between tiles.

## Screenshots
| File | Shows |
|---|---|
| screenshots/RF/map-default-before.png, -after.png | All-pins view, old vs new tile filter |
| screenshots/RF/map-street-before.png, -after.png | Street level (zoom 15), street names still readable |
| screenshots/RF/presenter-after.png | Presenter view 1280×720, all 12 pins visible |
| screenshots/S5/03-payment-test-card.png | Both card buttons in one row |
| screenshots/S4/04-slot-unavailable-suggestions.png | 09:00, 12:00, 12:30 |
| demo-kit/screens/phone/05-map-district-preview.png | Kwun Tong search, $30 pin, preview |
| demo-kit/screens/phone/19-owner-scheduler.png | Hoi Bun Road availability |

## Known bugs / risks
- Kwun Tong has one charger, so the district search lands at street level on a single $30 pin. That is what the script describes.
- Hoi Bun Road is seeded as open every day 07:00–22:00, while the script line says "only bookable while they're at work". The line is as written in RF-8; the screen doesn't contradict it, but it doesn't illustrate working hours either.
- Backup video is 2 min 48 s (was 2 min 36 s); driver video is 1 min 16 s.

## Decisions made
- Demo path taps the **$30 pin** rather than the list card: at peek the card is mostly hidden, and the pin is centred after the district zoom.
- Fit also re-runs on resize until the user pans, so the presenter iframes settle on the right view.
- Kept integer zoom levels (crisp tiles, no seams) over tighter pin spacing.

## Needs a human (Roman or the reviewer)
- Watch the new `backup-demo.webm` once and rehearse the 4:45 script against a clock.
- Decide whether the "at work" line should change, or the Hoi Bun Road seed hours should (a data change, so it needs an RF item).
- The team still has to confirm the softened supply claim against the report's competitor section.
- Unchanged from `FINAL_REPORT.md`: real phones, projector, team names, photos, MP4.

## Commits & deploy
- Commits: 195e532 RF-4 · 4278b16 RF-5 · bca1dcc RF-6 · 1df7f54 RF-7 · de57bae RF-8 · 021fd1a RF-9 · 4cc9d17, 8519638, f4356f3 RF-10 · 0a877a8 timestamp fix in PROGRESS.md
- Tags: `v1.0-freeze` unchanged (d5bb4d7) · `v1.1-demo` → f4356f3 (one commit behind `main`; the later commits only touch PROGRESS.md and this report)
- Pushed: yes · Actions run: green · Live URL checked: yes (smoke test)
