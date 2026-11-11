# S6_TASK — Owner side (earnings, payouts, availability scheduler)

Read `CLAUDE.md` first and follow the autonomous run protocol.

**Diagram steps covered:** D2 "Receives payment from driver and holds fund in escrow" → "Finalises the bill, deducting 15–20% commission and gateway fee" → "Triggers net payout to owners" → "Payout request received by bank/FPS, then transfers fund" → "Receives net payout from bank". D3 "Update access codes, photos, etc. when needed". Proposal: availability scheduler (weekly windows), automated payouts.

This is the screen that makes the **business model** visible to the judges, so the numbers must be exact and easy to read.

## 1. Money rules — `src/lib/money.ts` (pure functions, with checks)
- `COMMISSION_RATE = 0.18` (from the seed constants) and `GATEWAY_FEE_RATE = 0.03`.
- `breakdown(price)` → `{ gross, commission, gatewayFee, net }`, each rounded to cents, with `net = gross − commission − gatewayFee`. Check: HK$30 → 5.40, 0.90, **23.70**. HK$50 → 9.00, 1.50, 39.50.
- `ownerBalance(ownerId, db)` → `{ inEscrow, available, paidOut, lifetimeNet }`:
  - `inEscrow`: net of bookings that are `paid` or `active` (the platform is holding the money).
  - `available`: net of `completed` bookings minus all payouts.
  - `paidOut`: the sum of payouts.
- Update the S4 request card to show the same net figure ("You earn HK$23.70 · after 18% service fee and 3% payment fee").

## 2. Earnings `#/owner/earnings`
- **Balance card** (black, white text): "Available to withdraw" with the amount in large type and a white **"Withdraw"** button. Under it, two small figures: "Held until sessions end" (`inEscrow`) and "Paid out so far".
- **This week:** a simple 7-day bar chart in SVG (net per day, today's bar in `--blue`, the others grey, day letters underneath, the week's total above). No chart library.
- **Transactions:** completed bookings, newest first. Each row shows the driver, the spot, the date and the net amount. Tapping a row expands the **breakdown**:
  ```
  Booking total            HK$30.00
  Plug & Park fee (18%)   −HK$5.40
  Payment processing (3%) −HK$0.90
  You receive              HK$23.70
  ```
- Bookings in escrow appear in a separate "Pending" group with the badge "Released after the session".
- Empty state: "No earnings yet — approve your first request".
- Everything updates **live** when a driver pays or finishes a session on the other phone.

## 3. Withdraw (sheet from the Earnings screen)
- Shows the amount (the full available balance; disabled with a hint when it's zero).
- **Method:** two selectable cards — "FPS" (an FPS ID field: an 8-digit HK mobile number or an email; validated) and "Bank transfer" (bank name select with three generic entries such as "Bank A", plus a 9–12 digit account number; only the last 4 digits are stored). The demo owner's FPS ID is pre-filled with their phone number.
- **"Withdraw HK$xx"** → create a `Payout` with status `processing` → a success state "On its way — usually within minutes via FPS".
- A payout turns `paid` about 8 seconds after it was created (computed from `createdAt`, so it survives a reload).
- **Payout history** below the transactions: date, method, amount and a status badge (Processing in amber, Paid in green).

## 4. My spots `#/owner/spots`
- A list of the owner's spots: thumbnail, title, district, price per hour, rating, and an **active switch**. Turning a spot off hides it from the driver's map immediately (live), and it can't be requested.
- Tapping a spot opens **Manage spot** `#/owner/spots/:id` with three sections, each saved with its own "Save" button and a "Saved" toast:
  1. **Price:** a stepper or slider from HK$20 to HK$35 in HK$1 steps, with the line "Drivers pay HK$28/hour · you receive about HK$22.12".
  2. **Availability scheduler** (the proposal's core owner feature):
     - Seven rows, Monday to Sunday. Each has a switch (available that day) and, when on, **From** and **To** time pickers in 30-minute steps.
     - Validation: To must be later than From ("End time must be after start time").
     - Shortcuts: "Copy Monday to all weekdays" and "Weekdays 08:30–19:00" (the "while I'm at work" preset from the proposal).
     - A summary line that uses `formatAvailability`.
     - Saving updates the spot; the driver's spot details and booking sheet reflect it live. Existing bookings are untouched.
  3. **Access:** the 4-digit gate PIN (exactly 4 digits) and the access instructions (max 200 characters). A note: "Drivers see this only after they pay."
- Keep the model at one window per day (replace the spot's windows for that day on save).

## 5. Requests history
Add a "History" section or segment to the Requests screen: declined, cancelled and completed requests with their outcome, so nothing disappears.

## 6. Owner account `#/owner/account`
Name, email, phone, rating, number of spots, lifetime earnings, payout method on file (masked), and Sign out.

## Shots (`Claude outputs1/screenshots/S6/`)
Earnings (demo owner with history) · a transaction expanded · pending/escrow group · withdraw sheet (FPS) · withdraw validation error · withdraw success · payout history (processing, then paid) · my spots · manage spot: price · scheduler default · scheduler with an error · scheduler after "Weekdays 08:30–19:00" · access section · requests history · earnings empty state (new owner) · presenter view: driver finishing a session and the owner's balance changing.

## Done when
- [ ] `breakdown` and `ownerBalance` checks pass for the listed cases, and every money figure on screen comes from them.
- [ ] After a driver pays, the owner sees the net in "Held"; after the session completes it moves to "Available" — live, on the other phone.
- [ ] Withdraw creates a payout, reduces the available balance to zero, and the payout turns Paid by itself, including across a reload.
- [ ] The scheduler saves valid changes, rejects an invalid range, and the driver's booking sheet offers exactly the new hours.
- [ ] Switching a spot off removes its pin on the driver's phone within a second.
- [ ] The full stored bank account number never reaches `localStorage` (extend the S5 storage check).
- [ ] `npm run check` passes for S1–S6.
