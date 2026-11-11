# S4_TASK — Booking core (request → owner approval, live on two phones)

Read `CLAUDE.md` first and follow the autonomous run protocol.

**Diagram steps covered:** D1 "Select booking time slot (15m, 30m, 1h)" → "Submit a booking request" → "Charging spot available?" (Yes/No) → "Send booking request to owner" → "Approve request?" (Yes/No) → "Driver is notified…". D2 "Receive booking request in app" with "booking time slot and driver info". Proposal: owners review requests **based on driver rating**.

This session contains the single most important demo moment: the owner taps Approve on one phone and the driver's phone changes by itself.

## 1. Booking rules — `src/lib/booking.ts` (pure functions, with checks)
- `isWithinAvailability(spot, start, minutes)`: the whole slot lies inside one availability window of that weekday.
- `hasConflict(spotId, start, minutes, bookings)`: overlaps a booking of that spot whose status is `confirmed`, `paid` or `active`. A `pending` request doesn't block.
- `checkSlot(...)` returns `'ok' | 'closed' | 'taken' | 'past'`.
- `freeSlotsNear(spot, start, minutes, bookings, n)`: the next `n` free start times that day (30-minute steps), for suggestions.
- Actions that update the DB through `updateDB` and refuse an invalid transition: `requestBooking`, `cancelRequest` (driver, only while pending), `approveBooking` (re-checks the conflict; if the slot was taken meanwhile it declines with reason "Slot no longer available"), `declineBooking(reason)`.
- Add to `Booking`: `declineReason?: string`. Bump `DB_VERSION` whenever the shape of stored data changes.

Seed reminder: Kwun Tong (`sp_kwuntong_1`) has a **paid** booking tomorrow 10:00–12:00. That's the slot the demo uses to show "unavailable".

## 2. Booking sheet (opens from "Request booking" on spot details)
A bottom sheet at full height:
1. Spot title and price per hour.
2. **Day chips:** Today, Tomorrow, then the next 5 days as "Sat 14". Days with no availability window are disabled.
3. **Start time:** a grid of 30-minute start times inside that day's windows. Times in the past are disabled. **Taken times are not hidden or disabled** — the platform's availability check in step 6 is what catches them, as in the flow diagram.
4. **Duration chips:** 15 min, 30 min, 1 h, 2 h. Durations that would run past closing time are disabled.
5. **Summary:** "Thu 12 Nov · 13:00–14:00", the total from `priceFor`, and "You pay only after the owner approves."
6. **"Request booking"** button → a short "Checking availability…" state (about 1.2 s, spinner in the button) → then:
   - **Taken or closed (the diagram's No branch):** the sheet shows an amber notice "This slot is no longer available" with up to three buttons for the nearest free start times. Tapping one selects it. No booking is created.
   - **OK:** create the booking as `pending`, close the sheet and go to `#/app/booking/:id` with `replace`.

## 3. Booking status `#/app/booking/:id` (full screen)
- A back button (to Bookings) and the title "Your booking".
- A **progress stepper** with 5 steps: Requested → Approved → Paid → Charging → Done. The current step is black, finished steps have a blue check, later steps are grey.
- A **status card** that changes with the booking, **live** (no reload):
  - `pending`: a pulsing ring, "Waiting for Wong Mei Ling to approve", "Owners usually reply within minutes", and a grey "Cancel request" button (with a confirm).
  - `confirmed`: a green check with a short pop animation, "Approved! Pay to confirm your booking", and a black button **"Pay HK$30"** → `#/app/pay/:id` (S5; until then a placeholder).
  - `declined`: a red notice "The owner can't host this booking" with the reason, and "Find another charger".
  - `cancelled`: "You cancelled this request".
  - Later statuses are filled in by S5.
- A **details card:** spot thumbnail, title, address, date and time, duration, total.
- **In-app notification:** when a booking of the signed-in user changes status while they're on *any* screen, slide a toast down from under the demo banner: "Booking approved — pay to confirm" / "Booking declined". Tapping it opens the booking. This is the diagram's "Driver is notified…" step.

## 4. Owner area `#/owner`
- **Tab bar:** Requests (`#/owner`), Earnings (`#/owner/earnings`), Spots (`#/owner/spots`), Account (`#/owner/account`). Requests shows a red count badge of pending requests. Earnings and Spots are placeholders until S6; Account mirrors the driver's.
- **Requests screen:**
  - Header: "Hi, Mei Ling" and "2 requests waiting".
  - **Pending request cards**, newest first. Each card shows:
    - the driver: initial avatar, name, **★ rating with the number of ratings** and vehicle
    - the spot title, date, time range and duration
    - **"You earn HK$24.60"**, with the small line "HK$30.00 − 18% service fee" (the gateway fee is added in S6)
    - buttons **Approve** (black) and **Decline** (grey)
  - **Decline** opens a sheet with reasons: "I need the bay myself", "Charger under maintenance", "Other". Choosing one declines.
  - **Approve** shows a brief success state on the card, then the card moves to "Upcoming".
  - **Upcoming** section: confirmed and paid bookings with a status badge ("Awaiting payment" / "Paid").
  - New requests appear **live**, with a toast "New booking request".
  - Empty state: "No requests right now. We'll notify you when a driver books."

## 5. Presenter view `#/presenter` (the demo screen for the projector)
- Shows **two phone frames side by side**, labelled "EV driver" and "Charger owner", on the same dark stage. Each contains an `<iframe>` of the app itself, with `name="driver"` and `name="owner"`.
- The store keys the session by `window.name`, so each iframe keeps its own login. Before creating the iframes, set both sessions to the demo accounts if they're empty (sessionStorage is shared between same-origin frames in one tab). The driver iframe opens on `#/app`, the owner on `#/owner`.
- Inside an iframe the viewport is 390px wide, so the app renders full-screen with no inner frame. Add the fake status bar there too (detect `window.self !== window.top`), so each phone looks complete.
- Scale both phones together to fit the window; they must fit at **1280×720**.
- A small control row under the phones: "Reset demo" (resets, then reloads both iframes) and "Single phone" (back to `#/`).
- Below 900px wide, show "The presenter view needs a laptop-size screen" and a link back.
- Add "Open presenter view (two phones)" to the demo sheet, shown only in framed mode.
- Verify that `storage` events reach both iframes: approving in the owner iframe must change the driver iframe within a second.

## Shots (`Claude outputs1/screenshots/S4/`)
Booking sheet (default) · sheet with a slot chosen · "Checking availability…" · slot unavailable with suggestions · status pending · status confirmed · status declined · toast notification · owner requests (2 pending) · decline reason sheet · owner upcoming after approve · owner empty state · **presenter view at 1280×720 before approve** · **presenter view after approve** (driver shows "Approved!").

## Done when
- [ ] The driver can request Kwun Tong tomorrow at 13:00 for 1 h, and it appears as pending on both sides.
- [ ] Requesting tomorrow 10:00 (or 11:00, or 09:30 for 1 h) gives "no longer available" with free alternatives, and creates nothing.
- [ ] Approve and Decline each update the driver's status screen live, in a second tab **and** in the presenter view, and show the toast.
- [ ] Approving a request whose slot was taken in the meantime declines it with the right reason.
- [ ] Cancel works only while pending. Invalid transitions are refused.
- [ ] Request cards show the driver's rating and what the owner earns.
- [ ] The presenter view fits at 1280×720, keeps two separate logins, and its Reset works.
- [ ] `npm run check` passes for S1–S4.
