# S3 report — Discovery (map, filters, spot details)          Date: Wed 11 Nov 2026

## Done
- **Tooling:** `npm run check` (`scripts/check.mjs`) builds, starts the preview, runs every `scripts/checks/s*.mjs` and always stops the server. The shared server helper lives in `scripts/lib/server.mjs`. Dependencies: leaflet 1.9.4, react-leaflet 5, @types/leaflet. The map screen loads lazily (`React.lazy`).
- **Driver shell:** route guards in `components/RequireRole.tsx`; `components/TabBar.tsx` (Explore / Bookings / Account; hidden on spot details); `screens/driver/Account.tsx` (profile, Payment methods and Help as "Demo only" sheets, Sign out); `screens/driver/MyBookings.tsx` (empty state).
- **Map home:** `screens/driver/MapHome.tsx`:
  - 12 price pins (the selected one is blue and larger; the hit area is 44px or more).
  - A search pill that opens the district sheet (with counts) and flies the map to the district.
  - Combinable chips: All / CCS2 / Type 2 / CHAdeMO / GB/T / Open now / Under $25.
  - A three-snap sheet, `components/SnapSheet.tsx` (drag or tap the handle). It shows a live count, Price/Rating sort, the list, a preview card with "View details", and a no-results state with "Clear filters".
  - A tile-failure fallback: a banner, and the sheet opens to full.
  - Map state is kept when you go to details and back.
- **Logic:** `lib/availability.ts` (isOpenAt, nextOpening, windowsForDay, openStatus, formatAvailability), `lib/pricing.ts` (priceFor, isDcFast, estimateKwh), `lib/spots.ts` (filters, sort, district counts).
- **Photos:** `components/SpotPhoto.tsx` draws deterministic SVG scenes (garage, driveway, industrial, car park). There are 3 viewpoints per scene, and the car colours vary.
- **Spot details:** `screens/driver/SpotDetails.tsx` has every block from the task, from the carousel to the sticky "Request booking" bar. "Request booking" opens a "next build" sheet. An unknown id shows "no longer listed".

## Not done / partial
- None.

## Deviations from the task
- **Map tiles:** CARTO Positron now returns an "API KEY REQUIRED" watermark image for every tile (checked with curl; both `light_all` and `voyager` return it). The map uses `tile.openstreetmap.org` instead (no key), greyed with a CSS filter so it looks close to Positron. The attribution is "© OpenStreetMap contributors". **CLAUDE.md §3 should be updated.**
- **S1/S2 checks adapted, not weakened:** `#/app` is now the map, so the "signed-in name" assertions now look at `#/app/account`. The `#/owner` deep-link check sets an owner session first, because of the new guard. S2 shot `12-app-new-user` now shows Account.
- **Bug found by the s1 check and fixed:** `resetDemo()` and Account → Sign out now navigate **before** signing out. Before the fix, the route guard could bounce the window to `#/login` instead of `#/`.

## Checks
- typecheck: pass · build: pass · check: s1 pass, s2 62/62, s3 64/64 (passed on 2 runs in a row) · shots: S3 13, S2 12 re-shot; errors: none.
- Screenshot self-review: done. Fixed: the full sheet hid the tile-failure banner (it's now inside the sheet), and the attribution peeked out under the chips at full height (now hidden at full).
- **Framed mode:** at 1280×720 (scale ≈ 0.78), tapping the Sha Tin, Wan Chai and Tai Po pins selects each of them, and a drag moves a pin by exactly the drag distance (60, 30). So `transform: scale()` works with Leaflet 1.9 and no switch to `zoom` was needed.

## Screenshots (in Claude outputs1/screenshots/S3/)
| File | Shows |
|---|---|
| 01-map-all-pins.png | Map, 12 pins, peek sheet, tab bar |
| 02-map-ccs2-filter.png | CCS2 filter: 3 pins |
| 03-district-sheet.png | District sheet with counts |
| 04-pin-selected-preview.png | Kwun Tong selected (blue pin) and preview card |
| 05-sheet-full-list.png | Sheet at full: list view |
| 06-no-results.png | CCS2 + Under $25: no results, Clear filters |
| 07-tile-failure-fallback.png | Tiles blocked: banner and full list |
| 08-spot-details-top.png | Details: carousel, price, charger card |
| 09-spot-details-reviews.png | Details scrolled to the reviews |
| 10-bookings-empty.png | Bookings empty state |
| 11-account.png | Account |
| 12-framed-1280x720-selected.png | Projector frame with a pin selected |
| 13-spot-details-weekend-ac.png | Weekend-only AC spot (Opens Sat 08:00) |

## Known bugs / risks
- At zoom 11, the pins of close spots overlap (Sai Kung 1/2, Kwun Tong/Kowloon Bay). The pin on top gets the tap. The district filter or the list solves this in the demo.
- OSM's tile server asks for light use only, which is fine for a class demo.

## Decisions made
- "Under $25" means strictly under HK$25 per hour (6 spots).
- Charger-type chips act as single choice; tapping the active one again goes back to All.
- Review authors are shown as "First L." (e.g. "Sarah N.") for privacy.
- A spot with a rating count but no written reviews in the seed shows "No written reviews yet".
- At "full", the sheet leaves the search pill and chips visible (120px gap).
- Tapping the handle cycles peek → half → full → peek. Selecting a spot opens the sheet to half.

## Needs a human (Roman or the reviewer)
- Try map dragging and pinch-zoom on a real phone (Playwright covers mouse and tap only).

## Commits & deploy
- Commits: 4dad60c, c59aac1, e5934f5, plus this one ("S3: checks green, report").
- Pushed: yes · Actions run: see PROGRESS.md · Live URL checked: see PROGRESS.md
