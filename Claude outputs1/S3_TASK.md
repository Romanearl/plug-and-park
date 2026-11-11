# S3_TASK — Discovery (map, filters, spot details)

Read `CLAUDE.md` first and follow the autonomous run protocol. If S3 was already built from the `PLAN.md` row, do a **gap pass** against this file.

**Diagram steps covered:** D1 "Search and select a charging spot in the app" and "Display available charging spots (with details of the spot)". Proposal features: map view with district filter; spot details with photos, price, ratings and charger types.

## 0. Tooling
- Add `npm run check`: build, start `vite preview`, run every `scripts/checks/s*.mjs`, always stop the server, exit non-zero on any failure. Convert `s1.mjs` and `s2.mjs` to work under it.
- Dependencies: `leaflet`, `react-leaflet`, `@types/leaflet`. Import Leaflet's CSS once. Load the map screen lazily (`React.lazy`), so the landing page stays light.

## 1. Driver shell
- **Route guard:** `/app/*` needs a signed-in driver and `/owner/*` a signed-in owner. Not signed in → `#/login`. Wrong role → that role's home.
- **Tab bar** (`components/TabBar.tsx`) at the bottom of the driver area: **Explore** (`#/app`), **Bookings** (`#/app/bookings`), **Account** (`#/app/account`). 64px tall plus the home-indicator space, white, top hairline, icon above a 11px label, active tab black and inactive `--muted`. Hidden on full-screen flows (spot details and, later, payment and session).
- **Account** `#/app/account`: avatar circle with the user's initial, name, email, phone, vehicle, rating; rows "Payment methods" and "Help" (each opens a small "Demo only" sheet); **Sign out**.
- **Bookings** `#/app/bookings`: for now an empty state ("No bookings yet", "Find a charger" button). S5 fills it.

## 2. Map home `#/app`
- Full-bleed Leaflet map under everything, centred on Hong Kong (`[22.36, 114.13]`, zoom 11; min zoom 10, max 17; bounds limited to the HK area). Carto Positron tiles with the attribution from CLAUDE.md §3. No default zoom buttons.
- **Pins:** one `divIcon` per active spot — a black pill with a white price label like `$25`, plus a small pointer underneath. The selected pin turns `--blue` with black text and grows slightly. Pins must be at least 44px tall to tap.
- **Top overlay** (floats over the map, with a soft white gradient behind it):
  - A white pill "Where do you need to charge?" with a search icon. Tapping it opens the **district sheet**: "All districts" plus the 10 districts, each with its spot count. Choosing one filters the pins and flies the map to that district.
  - Below it, a horizontally scrolling chip row: `All`, `CCS2`, `Type 2`, `CHAdeMO`, `GB/T`, `Open now`, `Under $25`. Chips combine (charger type is single-choice; the last two are toggles). Active chips are black.
- **Bottom sheet** (above the tab bar) with three snap points — peek (about 120px), half, full — draggable by its handle, and tapping the handle toggles it. Reuse or extend `BottomSheet`.
  - **Nothing selected:** title "12 chargers nearby" (the live count after filters), a sort toggle (Price / Rating), then the **list** of spot cards: thumbnail, title, district · charger type · kW, rating, price per hour, and an "Open now" / "Opens 08:30" badge. Tapping a card selects it.
  - **A spot selected** (pin or card tapped): the map flies to it, and the sheet shows a preview card: photo, title, address, rating with review count, price, charger type and kW, the open badge, and a black **"View details"** button. A close (×) button deselects.
  - **No results:** "No chargers match these filters" with a "Clear filters" button.
- **Tile failure fallback:** if tiles fail to load (count `tileerror` events with none loaded after 4 seconds), show a small banner "Map unavailable — showing list" and open the sheet to full. The app must stay fully usable from the list.
- **Framed-mode check (important):** inside the scaled phone frame, verify with Playwright at 1280×720 that tapping a pin selects **that** pin and that dragging pans the map correctly. If `transform: scale()` breaks Leaflet's pointer maths, switch the device scaling to CSS `zoom` and re-run the S1 checks.

## 3. Availability logic — `src/lib/availability.ts` (pure functions, with checks)
- `isOpenAt(spot, date)`, `nextOpening(spot, from)`, `windowsForDay(spot, day)`.
- `formatAvailability(spot)` groups days with equal hours: "Mon–Fri 08:30–19:00", "Sat–Sun 09:00–18:00", "Every day 07:00–22:00".

## 4. Spot photos — `components/SpotPhoto.tsx`
Real photos come in S8. Until then, draw **deterministic SVG illustrations** from `spot.photoSeed`, `photoCount` and `propertyType`: a simple, flat scene (village-house garage, industrial bay, commercial car park, driveway) with a parked car outline and a charger post, in a palette from the design tokens (greys, `--blue`, `--blue-tint`, `--blue-ink`). Vary the scene per photo index so a carousel doesn't repeat itself. They must look intentional, not like broken images.

## 5. Spot details `#/app/spot/:id` (full screen, no tab bar)
From top to bottom:
1. **Photo carousel:** full width, 260px tall, scroll-snap, dot indicators, and a round back button and a "1/3" counter floating on top.
2. Title (`.h1`), then "Kwun Tong · Industrial building".
3. A row: ★ rating with "(54 reviews)" as a link to the reviews section, and the open badge.
4. **Price block:** "HK$30" large with "/ hour", and under it "15 min from HK$7.50" (from `priceFor`, section 6).
5. **Charger card:** connector type, power in kW, "DC fast" or "AC" (DC when kW ≥ 40), and a plain-language line: "Adds about 30 kWh in an hour" (use `min(powerKw, 60)` × hours; label it "estimate").
6. **Amenities** as chips.
7. **Availability:** the grouped lines from `formatAvailability`, with today highlighted.
8. **Access:** "You get a QR code and a PIN after payment."
9. **Hosted by:** owner name, their rating and "Usually replies in minutes".
10. **Reviews:** average and count, then the 3 newest (driver first name, stars, date, text) and "Show all" if there are more. Empty state: "No reviews yet".
11. **Sticky bottom bar:** price on the left, black **"Request booking"** on the right. Until S4 it opens a sheet saying "Booking opens in the next build" (S4 replaces it).
- An unknown id shows "This charger is no longer listed" with a "Back to map" button.

## 6. Pricing helper — `src/lib/pricing.ts`
`priceFor(spot, minutes)` = `pricePerHour × minutes / 60`, rounded to the nearest HK$0.50. Check: $30/h → 15 min $7.50, 30 min $15, 1 h $30, 2 h $60; $25/h → 15 min $6.50 (6.25 rounds to 6.50).

## Shots (`Claude outputs1/screenshots/S3/`)
Map with all pins · map with the `CCS2` filter · district sheet · map with a pin selected (preview sheet) · sheet at full (list view) · no-results state · tile-failure fallback (block tile requests) · spot details top · spot details scrolled to reviews · bookings empty state · account · framed 1280×720 with a pin selected.

Tiles need the network. Wait for them to load before each map shot. If the machine is offline, say so in the report.

## Done when
- [ ] 12 pins show; each filter and their combinations give the right count; the district filter flies the map.
- [ ] Tapping a pin or a list card selects the right spot, both full screen and inside the scaled frame.
- [ ] The sheet snaps to three heights by drag and by tap; the list scrolls inside it without moving the map.
- [ ] With tile requests blocked, the fallback banner shows and the list still works.
- [ ] Spot details show every block above with correct data for at least 3 different spots (one DC, one AC, one weekend-only).
- [ ] `isOpenAt`, `formatAvailability` and `priceFor` have checks for the cases listed.
- [ ] Route guards work for both roles; the tab bar navigates and hides on spot details.
- [ ] `npm run check` passes (S1 + S2 + S3), with no console errors apart from tile or font network errors.
