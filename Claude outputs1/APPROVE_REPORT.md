# APPROVE report — Booking requests never get stuck          Date: Mon 16 Nov 2026

## Done
- **Auto-approve (Part 1).** `AUTO_APPROVE_MS = 5000` is in `src/data/seed.ts`. The pure rule `dueAutoApprovals(bookings, now)` (plus `autoApproveAt`) is in `src/lib/autoApprove.ts`. The app-wide `src/components/AutoApprover.tsx` sits next to `Notifier` in `App.tsx`.
  - The timer counts from each booking's `createdAt`. On mount, on every DB change (including other windows), on `visibilitychange` and on `focus`, it approves whatever is due, and it sets a timer for the next due time.
  - It always goes through `approveBooking()`, so the slot re-check runs and non-pending bookings are refused. With several windows open, only one approval happens.
  - Wong Mei Ling's spots (both Sai Kung spots, Kwun Tong, Fo Tan) and the seeded `bk_pending_1` stay manual.
- **Pending requests in the demo sheet (Part 2)** (`src/components/DemoBanner.tsx`). The section lists every pending booking for any owner, styled like "Applications in review" (`.admin-list`, `.btn sm`).
  - Each row shows driver → spot, then the day, time, duration and owner.
  - **Approve** calls `approveBooking()`. **Decline** calls `declineBooking(id, 'Other')`.
  - When nothing is pending it shows "No pending requests.", and the list updates live across windows.
- **DEMO_SCRIPT.md**: one new row in "If something goes wrong": *A request stays on "Waiting…" → Demo strip → Pending requests → Approve*. No other wording changed.
- **Checks**: `scripts/checks/approve.mjs` (38 checks) is now part of `npm run check`.

## Not done / partial
- None.

## Deviations from the task
- No existing check assumed that another owner's request stays pending, so no earlier assertion was changed.
- Timing is measured from `createdAt`. The request is created after the ~1 s "Checking availability…" step, so the driver sees "Approved!" about 6 s after tapping **Request**. That is about 5.4 s after `createdAt`.

## Checks
- typecheck: pass · build: pass · check: 13/13 files pass (approve.mjs 38/38, all earlier files unchanged and passing) · smoke: Chromium, WebKit and Firefox pass locally; Chromium passes on the live URL · `approve.mjs` also passes 38/38 against the live URL.
- `approve.mjs` covers:
  - the unit tests (4.999 s not due, 5 s due, Wong never due, non-pending never due)
  - Kam Tin approved with the toast after 5.4 s
  - Kwun Tong still pending after 10 s
  - a reload at 2.5 s, still approved on time
  - a tab closed for 10 s, approved at once on return (100 ms)
  - cancel within 5 s, stays cancelled
  - the presenter view: pending → confirmed exactly once, one toast, no errors
  - a slot conflict: declined with "Slot no longer available"
  - the demo sheet: Decline on Lee Ka Fai's request and Approve on Wong's, both live in the other window; the empty state; a new request appearing live in an open sheet
- Screenshot self-review: done. I re-shot 01 so both rows are fully visible (they were cut off at the bottom).

## Screenshots (in Claude outputs1/screenshots/APPROVE/)
| File | Shows |
|---|---|
| 01-demo-sheet-pending-requests.png | Demo sheet, Pending requests: Lee Ka Fai's (Kam Tin) and Wong Mei Ling's (Sai Kung) |
| 02-demo-sheet-empty-state.png | "No pending requests." |
| 03-other-owner-request-waiting.png | Driver: "Waiting for Lee Ka Fai to approve" |
| 04-other-owner-request-auto-approved.png | The same booking 5 s later: "Approved! Pay to confirm" + toast |

## Known bugs / risks
- In shot 01, the Kam Tin request's `createdAt` was set 2 minutes ahead, only so auto-approve wouldn't remove it before the shot. This affects the screenshot only, not the app.
- Background tabs: browsers may throttle timers, so approval happens at the latest when the tab becomes visible or gets focus. The closed-tab check covers this case.

## Decisions made
- The rows read "Driver → Spot" plus a caption line, the same two-line pattern as "Applications in review". It keeps the demo sheet compact.
- `focus` is also listened to, alongside `visibilitychange`. Switching between the two presenter iframes doesn't change visibility.

## Proposed CLAUDE.md wording (for the reviewer; I did not edit the master)
- Add a row to §8 "Demo constants": `| Auto-approve | Requests to spots of owners other than Wong Mei Ling are approved AUTO_APPROVE_MS = 5000 ms after createdAt; Wong Mei Ling's stay manual |`

## Needs a human (Roman or the reviewer)
- Nothing new. The open items from NAVY-RESTORE still apply: re-add the iPhone home-screen shortcut, and check the dark map on the projector.

## Commits & deploy
- Commits: e24bcd9 (auto-approve + demo sheet), 0260c17 (checks + DEMO_SCRIPT row), 5b43696 (screenshots), plus this report.
- Pushed: yes · Actions run: green (5b43696) · Live URL checked: yes (smoke + approve.mjs) · Tag: **v1.4.1-demo**
