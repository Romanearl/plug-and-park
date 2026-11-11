# S4 report — Booking core (request → owner approval, live on two phones)          Date: Wed 11 Nov 2026

## Done
- **Rules (pure):** `src/lib/booking.ts` has `isWithinAvailability`, `hasConflict` (only confirmed/paid/active block), `checkSlot` (ok/closed/taken/past), `startTimesForDay`, `freeSlotsNear`, the transition table `canTransition`, and the helpers `hhmm`/`fmtDuration`/`endOf`.
- **Actions:** `src/lib/bookingActions.ts` has `requestBooking`, `cancelRequest` (pending only), `approveBooking` (re-checks the slot; if it was taken, it declines with "Slot no longer available") and `declineBooking(reason)`. Invalid transitions are refused. `Booking.declineReason` was added and **`DB_VERSION` is now 2**. Also added `ownerEarnings()` in `pricing.ts`.
- **Booking sheet:** `screens/driver/BookingSheet.tsx` opens at full height from "Request booking":
  - Day chips: Today, Tomorrow, then "Fri 13"…; days with no window are disabled.
  - A 30-minute time grid; past times are disabled and taken times are **not** hidden.
  - Duration chips; any that would run past closing are disabled.
  - A summary, "Checking availability…" (1.2 s), and then either the amber "This slot is no longer available" with up to 3 nearest free times, or a pending booking and `#/app/booking/:id` (replace).
- **Booking status:** `screens/driver/BookingStatus.tsx` has a 5-step stepper and a live status card (pending with a pulse and a two-tap Cancel, confirmed with a pop and "Pay HK$30", declined with the reason, cancelled), plus a details card. `#/app/pay/:id` is a placeholder until S5.
- **Notifications:** `components/Notifier.tsx` slides a toast down under the demo banner:
  - for the driver: "Booking approved — pay to confirm" or "Booking declined";
  - for the owner: "New booking request".
  - Tapping it opens the booking. There are no toasts for data that's already there when the screen loads.
- **Owner area:** an owner tab bar (Requests with a red badge, Earnings and Spots as S6 placeholders, Account). `screens/owner/Requests.tsx`:
  - The header reads "Hi, Mei Ling", followed by "N requests waiting".
  - Each card shows the driver with **★ rating, number of ratings and vehicle**, the spot and slot, and **"You earn HK$24.60"** with "HK$30.00 − 18% service fee".
  - Approve shows a success state, then the card moves to Upcoming ("Awaiting payment"/"Paid"). Decline opens a reason sheet.
  - There's an empty state, and an automatic-decline banner when a slot was taken.
  - Account is shared with the driver; it's role-aware (no vehicle row, "ratings from drivers").
- **Presenter view:** `#/presenter` (`screens/Presenter.tsx`) shows two scaled phones with `<iframe name="driver">` / `name="owner">`. The sessions are preset to the demo accounts, the fake status bar shows inside the iframes, and it has "Reset demo" (re-seeds, keeps both logins, reloads the frames) and "Single phone". Below 900px it shows the laptop message. The demo sheet links to it only in framed mode.

## Not done / partial
- None.

## Deviations from the task
- **Reset in the presenter** uses a new `reseedDemo()` (data only). `resetDemo()` would also navigate the top window away from `#/presenter`.
- **Earlier checks were adapted, not weakened.** The owner home is now Requests, so "signed in as owner" checks look for "Hi, Mei Ling", and the owner's Sign out is on `#/owner/account`. The s3 "Request booking" check now expects the real booking sheet.
- S1 shot `04-owner-placeholder` will show the Requests screen when re-shot.

## Checks
- typecheck: pass · build: pass · check: s1 pass, s2 62/62, s3 64/64, s4 56/56 · shots: 14 (S4), errors: none.
- The s4 checks cover:
  - pure-rule unit tests run through Vite `ssrLoadModule`;
  - 10:00/11:00/09:30 → unavailable with suggestions, and nothing is created;
  - 13:00 → pending on both sides;
  - Approve flips the driver live in under 1.5 s and Decline shows the reason, both with toasts;
  - Cancel works only while pending;
  - approving an overlapping request auto-declines it with the right reason;
  - card data;
  - the owner empty state and badge;
  - the presenter at 1280×720: both phones fit, separate logins, approving flips the driver frame in under 1 s, and Reset works;
  - the small-screen message.
- Screenshot self-review: done, nothing to fix.

## Screenshots (in Claude outputs1/screenshots/S4/)
| File | Shows |
|---|---|
| 01-booking-sheet.png | Default sheet (today, past times disabled) |
| 02-booking-sheet-slot-chosen.png | Tomorrow 13:00, 1 h, summary HK$30 |
| 03-checking-availability.png | Spinner "Checking availability…" |
| 04-slot-unavailable-suggestions.png | 10:00 taken: amber notice + 3 suggestions |
| 05-status-pending.png | Pending: pulse, Cancel request |
| 06-status-confirmed.png | Approved! Pay HK$30 |
| 07-toast-notification.png | Toast "Booking approved — pay to confirm" |
| 08-status-declined.png | Declined, with the reason |
| 09-owner-requests-2-pending.png | Owner: 2 requests, ratings, "You earn" |
| 10-decline-reason-sheet.png | Decline reasons |
| 11-owner-upcoming-after-approve.png | Upcoming: Awaiting payment / Paid |
| 12-owner-empty.png | "No requests right now" |
| 13-presenter-1280x720-before-approve.png | Two phones, request waiting |
| 14-presenter-1280x720-after-approve.png | Driver shows "Approved!" |

## Known bugs / risks
- Browser back from the status screen skips the spot details (the request uses `replace`, as specified). The back button goes to Bookings, which stays empty until S5.

## Decisions made
- The owner greeting uses the given name with HK surname-first order ("Wong Mei Ling" → "Mei Ling").
- Approving updates the DB immediately, so the driver flips at once. The owner's card shows its success state for about 1.1 s before it moves to Upcoming.
- Cancel uses a two-tap confirm, the same pattern as Reset demo.
- After "Approved", the stepper marks "Paid" as the current step: the next thing the driver must do.

## Needs a human (Roman or the reviewer)
- Rehearse the presenter view on the real projector (1280×720), and check that both phones are readable from the back of the room.

## Commits & deploy
- 9fc33e1, 5786f5d, 146992a, bcf52a9, plus this one ("S4: shots + report"). Deploy: see PROGRESS.md.
