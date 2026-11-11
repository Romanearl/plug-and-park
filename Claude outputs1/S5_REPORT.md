# S5 report — Driver path (pay → QR/PIN → charge → rate)          Date: Wed 11 Nov 2026

## Done
- **Data:** `Booking` gains `paidAt`/`startedAt`/`completedAt`, and `Review` gains `tags`. **`DB_VERSION` is now 3.** The seeded completed and paid bookings get matching timestamps.
- **Rules (pure):**
  - `src/lib/payment.ts`: `luhn`, `cardBrand`, `formatCardNumber`, `formatExpiry`, the four validators with the exact error texts, and `mockGateway` (about 1.5 s; declines `4000…0002`).
  - `src/lib/session.ts`: `sessionState` (25 s of demo time, derived from `startedAt`) and `nextRating` (weighted average).
- **Actions:** `payBooking` (stores **only the last 4 digits**, the PIN, the qrPayload and `paidAt`), `startSession` (refuses a second start), `completeSession` (optionally skipping to the end) and `submitReview` (creates the review, marks the booking reviewed, updates the spot's rating and count), all in `src/lib/bookingActions.ts`.
- **Payment `#/app/pay/:id`:**
  - Only a `confirmed` booking can be paid.
  - Summary card plus the escrow line.
  - Card form: auto-spacing, brand label, expiry slash, the right `inputMode`/`autoComplete`, and `useForm` validation.
  - "Use test card", the lock line, and a Processing… state.
  - A decline shows a red banner, clears everything except the name, and leaves the booking payable.
  - Success replaces the route with the confirmation screen.
- **Confirmation `#/app/confirm/:id`:** a scannable offline QR (`components/QrCode.tsx`, an SVG from the `qrcode` package), a large spaced PIN with Copy, instructions, Open in Maps (OSM, new tab), and "I've arrived — start charging" → "Verifying access…" → the session.
- **Session `#/app/session/:id`:** black screen with a blue progress ring and battery %, live tiles (energy, time left, power with a wobble, cost), a pulsing status line, and a two-tap Stop. It completes by itself at the end. The summary leads to "Rate your experience". The demo sheet offers "Skip charging to the end" while a session is active. The owner sees "Charging now" with a live dot.
- **Rate `#/app/rate/:id`:** five large stars (required), tag chips, a 300-character text box with a counter, a thank-you state, and "Skip for now".
- **Bookings:** Upcoming and Past segments, each with an empty state. Each card has a badge and one action (View request / Pay now / View access / Resume session / Rate / Book again). The booking status screen now covers paid (link to access), active (link to session) and completed (receipt and Rate).

## Not done / partial
- None.

## Deviations from the task
- **Battery cap:** delivered energy is capped at what a 60 kWh battery can still take from 35% (39 kWh). Without the cap, a 50 kW, 1 h session hit 100% at about 60% of the session while still showing "12 min left" (seen while self-reviewing the screenshots). Now the ring reaches 100% exactly at the end. The spot details estimate ("Adds about 50 kWh in an hour") is unchanged.

## Checks
- typecheck: pass · build: pass · check: s1 pass, s2 62/62, s3 64/64, s4 56/56, s5 62/62 · shots: 16 (S5), errors: none.
- The s5 checks cover:
  - unit tests for every payment rule and the session maths;
  - each form error;
  - the decline branch, with the booking staying payable;
  - the paid fields;
  - a **storage scan** that finds no full card number, expiry or CVC in localStorage or sessionStorage;
  - **real QR decoding** (jsQR in the page on the rendered SVG returns `PLUGPARK|<id>|7350`);
  - Back never returns to the card form, and `#/app/pay` redirects once paid;
  - "Verifying access…", no second start, the owner's "Charging now";
  - **progress continues after a reload**, and the session completes after about 25 s with 39 kWh;
  - review validation, then rating 4.8 · 54 → 4.8 · 55 with the new review first on the spot;
  - all 8 status → badge/action pairs in Bookings, both empty states, and the demo-sheet skip.
- Screenshot self-review: done; it led to the battery-cap fix.

## Screenshots (in Claude outputs1/screenshots/S5/)
| File | Shows |
|---|---|
| 01-payment-empty.png | Summary, escrow line, empty form |
| 02-payment-errors.png | Invalid number, expired, 2-digit CVC, no name |
| 03-payment-test-card.png | Filled with 4242, VISA label |
| 04-payment-processing.png | Processing… |
| 05-payment-declined.png | Red decline banner |
| 06-confirmation-qr-pin.png | QR code + PIN 7350 + instructions |
| 07-session-20pct.png | Session early |
| 08-session-80pct.png | Session at 87% battery |
| 09-session-summary.png | Session complete |
| 10-rate-empty.png / 11-rate-filled.png / 12-rate-thank-you.png | Rate flow |
| 13-bookings-upcoming.png / 14-bookings-past.png | Bookings segments |
| 15-owner-charging-now.png | Owner Upcoming with "Charging now" |
| 16-spot-details-new-review.png | New review at the top |

## Known bugs / risks
- The session needs the page open to complete by itself. If every window is closed, it completes the next time the session or a booking screen is opened (it's derived from `startedAt`), or via the demo-sheet skip.

## Decisions made
- The charging session keeps the booked total as the "cost" (fixed price, as in the task); energy is informational.
- The thank-you screen leads to "Back to map", per the task.
- "Stop charging" uses a two-tap confirm, the same pattern as Cancel and Reset.

## Needs a human
- Scan the QR on a real phone during rehearsal. It decodes in the check, but a scan on a projector screen is worth trying.

## Commits & deploy
- 17a0e18, faf29f2, b952f05, plus this one ("S5: battery cap, shots, report"). Deploy: see PROGRESS.md.
