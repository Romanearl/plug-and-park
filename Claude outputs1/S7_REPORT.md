# S7 report — Owner onboarding + every "No" branch + state sweep          Date: Wed 11 Nov 2026

## Done
- **Data:** `Spot.reviewStatus` (`approved | in_review | changes_requested`), `reviewNote` and `photos`. `User.payoutMethod` is now `{ type, label }` (masked label only) and pre-selects the method in the S6 withdraw sheet. **`DB_VERSION` is now 5.** Only `approved` **and** `active` spots appear on the map, open in details, or can be requested (`filterSpots`, `SpotDetails`, `requestBooking`).
- **New-owner home:** the welcome card ("List your charger and earn while you're at work", three benefit lines, "List my charger"), in `owner/Requests.tsx`.
- **Application `#/owner/apply` (`owner/Apply.tsx`, lazy-loaded):**
  - "Step N of 3" with a progress bar. The draft is saved to sessionStorage on every change, so a reload keeps the step and the fields.
  - Step 1: title, address, district select, property-type cards, and a 200px Leaflet mini map centred on the district (`DISTRICT_CENTRES`) with a draggable pin.
  - Step 2: connector chips, power select, price stepper/slider with "you receive about…", the district tip ("Similar bays in Sai Kung charge HK$23–25"), and amenity chips.
  - Step 3: three photo tiles (file picker → resized to ≤800px → JPEG data URL ≤120 KB; falls back to an illustration with a notice), "Use sample photo", the shared scheduler (`components/ScheduleEditor.tsx`, now also used by Manage spot) preset to weekdays, and the rights checkbox.
  - Every field validates. Submitting goes through "Submitting…" to "Application received" with a 3-step timeline.
- **Platform decision (diagram 3 diamond):** the demo sheet's "Platform (admin) actions" lists applications in review, each with Approve / Request changes (`lib/applyActions.ts`).
  - **No:** amber card with the note + "Edit application" → pre-filled form ("Editing your application" banner) → Resubmit → `in_review`.
  - **Yes:** toast + a "You're approved — one last step" card → **Finish setup** `#/owner/setup/:id` (gate PIN, instructions, FPS/bank payout with only the masked label stored) → **Go live** → approved + active, the pin appears live on the driver's map, and My spots shows "Your charger is live".
  - Owners get toasts for both decisions (`Notifier`).
- **"Show a 'No' branch"** section in the demo sheet, with a hint for each of the four branches.
- **Sweep fixes:**
  - Withdraw now has a "Sending…" state and ignores double taps.
  - A user removed by a reset in another window is signed out cleanly (the stale session is cleared in the `storage` listener).
  - **`overflow: clip` on the frame layers**: `scrollIntoView` or focus could scroll the whole screen sideways or up, which was visible in a screenshot. Now only `.scroll` and sheet bodies scroll.
  - Single-line ellipsis on names in rows; `clamp-2` on long titles.
  - My spots shows review badges and routes in-review / approved-not-live spots to the right screen.

## Not done / partial
- None.

## Deviations from the task
- **Where the draft lives:** the task allowed the DB or sessionStorage. I chose sessionStorage, so an unsubmitted draft never shows up anywhere else.
- **Approved but not live:** an approved spot stays `active: false` until "Go live" (the diagram's "Provide access code and payment information" comes before "Add charging spot to the platform"). So "approved" alone doesn't put a pin on the map.

## Checks
- typecheck: pass · build: pass · check: s1 pass, s2 62, s3 64, s4 56, s5 62, s6 43, **s7 53** — all pass · shots: 15 (S7), errors: none.
- The s7 checks cover:
  - **sign-up as owner → welcome → apply** (every step-1 error, step-2 error, step-3 errors), the draft surviving a reload on steps 1 and 2, a real file upload stored as a JPEG data URL, sample photo, preset hours, and Submitting… → received;
  - the spot is in_review and inactive, and **drivers can't see it on the map or open it**;
  - **Request changes** → toast + card → pre-filled edit → resubmit;
  - **Approve** → toast + card → not live yet → Finish setup validation → **Go live (double-tapped)** → toast, stored PIN, masked payout, **pin live on the driver's map**;
  - **all four "No" branches end to end** (unavailable slot with a double-tapped Request creating exactly one booking, owner decline, card decline with a double tap, application changes);
  - unknown ids for booking/pay/confirm/session/rate/spot/setup;
  - Reset while on a screen → `#/`;
  - withdraw double tap → one payout;
  - a long name and email → no horizontal overflow;
  - a user removed by a reset elsewhere → signed out, session cleared.
- Screenshot self-review: done. It found the whole-screen scroll bug, now fixed with `overflow: clip`.

## State sweep
| Screen | Empty | Loading | Error | Fixed in S7 |
|---|---|---|---|---|
| Landing | — | — | — | — |
| Register / Login / Verify | — | Login "Checking", verify tick | all fields, wrong code, 5-try lock | — |
| Map home | "No chargers match" + Clear | lazy spinner, tile fallback | tiles fail → list | overflow clip |
| Spot details | "No reviews yet" | — | "no longer listed" (unknown, hidden or in review) | in-review spots hidden |
| Booking sheet | "Closed on this day" | "Checking availability…" | slot unavailable + suggestions | — |
| Booking status | — | — | "Booking not found" | — |
| Payment | — | "Processing…" | field errors, declined banner, unknown id → redirect | — |
| Confirmation | — | "Verifying access…" | unknown / unpaid → redirect | — |
| Session | — | live ring | unknown → redirect; can't start twice | — |
| Rate | — | — | stars required; unknown → redirect | — |
| Bookings | Upcoming + Past empty states | — | — | — |
| Account (driver / owner) | "Not added" / "Not set" | — | — | long name wraps (checked) |
| Owner requests | "No requests right now", new-owner welcome | approve success state | auto-decline banner | welcome + application cards |
| Earnings | "No earnings yet…" | withdraw "Sending…" | FPS / account errors, zero balance hint | **Sending… + double-tap guard** |
| My spots | "No spots yet" | — | — | review badges, flash toast |
| Manage spot | — | — | "Spot not found", range, PIN | shared ScheduleEditor |
| Apply | map placeholder until a district is chosen | "Submitting…", photo "Resizing…" | every field per step | new |
| Finish setup | "Nothing to set up here" | "Going live…" | PIN, instructions, payout | new |
| Presenter | small-screen message | iframes load | — | — |
| All screens: Reset while open | → `#/` | | | checked (s7) |
| All screens: user removed elsewhere | → signed out (login) | | | **store clears the stale session** |

## Screenshots (in Claude outputs1/screenshots/S7/)
| File | Shows |
|---|---|
| 01-new-owner-welcome.png | Welcome card |
| 02-apply-step1.png / 03-apply-step1-errors.png | Step 1 (map pin) / errors |
| 04-apply-step2.png / 05-apply-step3-photos.png | Steps 2 and 3 |
| 06-application-received.png | Timeline |
| 07-demo-sheet-platform-actions.png | Approve / Request changes |
| 08-changes-requested-card.png | Amber card with the note |
| 09-finish-setup.png / 10-go-live-toast-my-spots.png | Setup → "Your charger is live" |
| 11-driver-map-new-pin.png | The new spot on the driver map |
| 12-no-branch-section.png | "Show a 'No' branch" |
| 13-error-booking-not-found.png / 14-error-owner-spot-not-found.png / 15-empty-past-bookings.png | Error and empty states |

## Known bugs / risks
- Photo data URLs make `localStorage` bigger (up to about 360 KB per application). If storage is full, the tile falls back to an illustration and says so.

## Decisions made
- The platform note for "Request changes" is fixed ("Please add a clearer photo of the charger"), as the task suggests.
- A new spot starts with rating 5.0 and 0 reviews, shown as "★ 5.0 (0)".

## Needs a human
- Try uploading a real phone photo on iOS Safari (HEIC is converted by the browser when it's drawn on the canvas).

## Commits & deploy
- 701e071, 9f0c478, 56671ab, 2e6a4ee, plus this one ("S7: overflow clip, shots, report"). Deploy: see PROGRESS.md.
