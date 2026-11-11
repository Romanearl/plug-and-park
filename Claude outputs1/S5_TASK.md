# S5_TASK — Driver path (pay → QR/PIN → charge → rate)

Read `CLAUDE.md` first and follow the autonomous run protocol.

**Diagram steps covered:** D1 "Proceed to make payment in app" → "Payment gateway processes payment" → "Payment successful?" (Yes/No) → "Provide access method (QR/PIN)" → "Go to location and use access method to verify arrival" → "Start charging and monitor charging progress" → "Charger system sends live charging data" → "Display the state of charge" → "Booking session complete" → "Rate and review charging spot". Proposal: live progress tracking (charging status and time remaining).

**Hard rule:** never store a card number, expiry or CVC anywhere (not in the DB, localStorage or logs). Keep only the last 4 digits.

## 0. Data
Add to `Booking`: `paidAt?`, `startedAt?`, `completedAt?` (ISO strings). Bump `DB_VERSION`. Give the seeded completed bookings sensible values.

## 1. Payment rules — `src/lib/payment.ts` (pure functions, with checks)
- `luhn(number)`; `cardBrand(number)` → `'visa' | 'mastercard' | 'unknown'` (4… / 51–55, 2221–2720); `formatCardNumber` (groups of 4).
- `validateCardNumber` (13–19 digits and Luhn): "Enter a valid card number".
- `validateExpiry('MM/YY')`: a real month, not in the past: "Enter a valid expiry date" / "This card has expired".
- `validateCvc`: exactly 3 digits: "Enter the 3-digit security code".
- `validateCardName`: 2+ characters: "Enter the name on the card".
- `mockGateway(cardNumber)` → resolves after about 1.5 s with `{ ok: true }`, or `{ ok: false, reason }` for `4000 0000 0000 0002` ("Your card was declined. Try another card.").

## 2. Payment `#/app/pay/:bookingId` (full screen, no tab bar)
- Only reachable for the driver's own booking in status `confirmed`; otherwise redirect to the booking screen.
- **Order summary card:** spot, date and time, duration, "Charging bay HK$30.00", total.
- **Card form:** card number (auto-spaced, brand label on the right, `inputMode="numeric"`, `autoComplete="cc-number"`), expiry (auto-inserts the slash), CVC, name on card. Same validation behaviour as the auth forms (`useForm`).
- A grey button **"Use test card"** fills the form with `4242 4242 4242 4242`, an expiry two years ahead, `123` and the user's name.
- A lock line: "Demo only — no real payment is taken. Never enter a real card."
- **"Pay HK$30"** → the button shows "Processing…" and the form locks → then:
  - **Declined (the diagram's No branch):** a red banner with the reason; the form unlocks and keeps the name but clears the number, expiry and CVC. The booking stays `confirmed`.
  - **Success:** set the booking to `paid`, with `paymentLast4`, `pin` (the spot's `accessPin`), `qrPayload` (`PLUGPARK|<bookingId>|<pin>`) and `paidAt`. Go to the confirmation screen with `replace`, so Back never returns to the card form.
- A small line under the total: "Held securely by Plug & Park and released to the owner after your session." (This is the escrow step of diagram 2.)

## 3. Confirmation `#/app/confirm/:bookingId`
- A green check animation and "You're booked!".
- **Access card:** a real, scannable **QR code** of `qrPayload` (rendered offline as SVG — add the `qrcode` package or equivalent), and the **PIN** in large spaced digits with a "Copy" button.
- The address, the owner's access instructions, date, time and duration.
- "Open in Maps" — a link to `https://www.openstreetmap.org/?mlat=…&mlon=…#map=17/…` in a new tab.
- Black button **"I've arrived — start charging"** → a short "Verifying access…" state (1 s) → the booking becomes `active` with `startedAt` → the session screen. In the demo this works at any time; show the note "Demo: you can start right away".

## 4. Charging session `#/app/session/:bookingId` (black screen, `useStatusBar('dark')`)
- The whole session runs in **demo time: about 25 seconds from start to full**, whatever the booked duration. Progress is computed from `startedAt`, so reloading or switching tabs continues it correctly. Keep the demo duration in one constant.
- A large **progress ring** in `--blue` with the battery percentage in the middle (it runs from a start level of 35% up, by kWh delivered ÷ a 60 kWh battery, capped at 100%).
- Live tiles: **Energy delivered** (kWh, counting up to `min(powerKw, 60) × hours`), **Time remaining** (shown in booked time, e.g. "42 min left"), **Power** (kW with a small live wobble), **Cost** (the fixed booking total).
- A status line with a pulsing dot: "Charging — live data from the charger".
- A white button "Stop charging" (with a confirm) ends the session early.
- When progress reaches the end, or on Stop: the booking becomes `completed` with `energyKwh` and `completedAt`, and the **session summary** shows: "Session complete", energy, duration, total paid to the card ending 4242, and a button **"Rate your experience"**.
- The demo sheet gets "Skip charging to the end" while a session is active.
- The owner's Requests screen shows the booking as "Charging now" with a live badge while it's active.

## 5. Rate & review `#/app/rate/:bookingId`
- The spot thumbnail and title, then "How was your charge?".
- **Five large stars** (tap to set; required).
- Quick tags as chips (several can be chosen): "Easy to find", "Fast charging", "Clean bay", "Helpful owner", "Good value".
- An optional text area (max 300 characters, with a counter).
- **Submit:** create the `Review`, mark the booking `reviewed`, update the spot's `rating` (weighted average with `reviewsCount`, one decimal) and `reviewsCount`. Then a thank-you state and "Back to map". The new review appears at the top of the spot's reviews.
- "Skip for now" returns to Bookings; the booking keeps a "Rate" button.

## 6. Bookings `#/app/bookings`
- Two segments: **Upcoming** (pending, confirmed, paid, active) and **Past** (completed, declined, cancelled).
- Each card: thumbnail, spot title, date and time, a status badge, and one action that fits the status: View request / **Pay now** / **View access** / **Resume session** / **Rate** / Book again.
- Empty states for both segments.
- The booking status screen from S4 now covers every status (paid → link to access; active → link to session; completed → receipt).

## Shots (`Claude outputs1/screenshots/S5/`)
Payment empty · payment validation errors · payment filled with the test card · processing · declined banner · confirmation (QR + PIN) · session at about 20% · session at about 80% · session summary · rate empty · rate filled · thank-you · bookings upcoming · bookings past · owner card "Charging now" · spot details showing the new review.

## Done when
- [ ] The full path works from a confirmed booking: pay with 4242 → QR + PIN → start → progress → complete → 5-star review → the spot's rating and count change.
- [ ] `4000 0000 0000 0002` is declined and the booking stays payable. An invalid number, a past expiry and a 2-digit CVC each show their error.
- [ ] Nothing in `localStorage` contains a full card number, expiry or CVC (add a check that searches the stored DB).
- [ ] The QR code decodes to the payload (check by decoding the SVG's module matrix or with a QR reader library in the check script).
- [ ] The session continues correctly after a reload in the middle, and can't be started twice.
- [ ] Back navigation never returns to the payment form after paying.
- [ ] Every booking status shows the right badge and action in Bookings.
- [ ] `npm run check` passes for S1–S5.
