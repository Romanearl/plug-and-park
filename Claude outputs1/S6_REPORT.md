# S6 report — Owner side (earnings, payouts, availability scheduler)          Date: Wed 11 Nov 2026

## Done
- **Money rules:** `src/lib/money.ts` has `breakdown` (18% commission + 3% gateway fee; HK$30 → 5.40 / 0.90 / **23.70**; HK$50 → 9.00 / 1.50 / 39.50), `ownerBalance` (inEscrow / available / paidOut / lifetimeNet), `payoutStatus` (Paid 8 s after `createdAt`), `hk2`, and the validators (FPS ID, account number, PIN, time range). **Every owner money figure comes from here.** The S4 request card now shows "You earn HK$23.70 · after 18% service fee and 3% payment fee".
- **Owner actions:** `src/lib/ownerActions.ts` has `requestPayout` (the full available balance; refuses an unmasked destination), `setSpotActive`, `setSpotPrice` (20–35), `setSpotAvailability` (one window per day; validates) and `setSpotAccess`.
- **Data:** `Payout.destination` (masked) and `User.payoutMethod` were added. **`DB_VERSION` is now 4.** The demo owner has "FPS •••• 9876" on file.
- **Earnings `#/owner/earnings`:**
  - A black balance card: available, Withdraw, Held, Paid out.
  - A 7-day SVG bar chart (today in blue, with the week total).
  - A Pending group: "Released after the session".
  - Transactions with tap-to-expand breakdowns.
  - Payout history with a Processing → Paid badge.
  - An empty state.
  - All of it updates live.
- **Withdraw sheet:** FPS (pre-filled with the phone, validated) or Bank transfer (Bank A/B/C, a 9–12 digit account number). **Only the masked last 4 digits are stored.** It shows a success state ("On its way…"), and the button is disabled with a hint at zero.
- **My spots `#/owner/spots`:** a list with an active switch; hidden spots disappear from the driver's map live and show "no longer listed".
- **Manage spot `#/owner/spots/:id`:**
  - **Price:** a −/+ stepper plus a slider, with the "Drivers pay … · you receive about …" line.
  - **Scheduler:** Mon–Sun switches, From/To selects in 30-minute steps, live validation, "Weekdays 08:30–19:00" and "Copy Monday to all weekdays", and a summary from `formatAvailability`.
  - **Access:** a 4-digit PIN and instructions up to 200 characters, with the "Drivers see this only after they pay" note.
  - Each section has its own Save button and a "Saved" toast.
- **Requests:** a History section (completed, declined with the reason, cancelled).
- **Owner account:** spots count, lifetime net earnings, masked payout method, Sign out.

## Not done / partial
- None.

## Deviations from the task
- **The s4 card check was updated** to the new net figure, because S6 §1 changes that card on purpose.
- Copy for an email FPS ID is masked as "FPS m•••@domain".

## Checks
- typecheck: pass · build: pass · check: s1 pass, s2 62, s3 64, s4 56, s5 62, s6 43 — all pass · shots: 17 (S6), errors: none.
- The s6 checks cover:
  - the money rules (both listed cases, rounding, a balance mix, payout timing, validators);
  - the seeded earnings (HK$94.01 available, HK$47.40 held) and an expanded breakdown;
  - live: the driver pays → Held 71.10, the session ends → Available 117.71;
  - withdraw validation (FPS and bank), success, balance to 0, the masked row, **no full account number in storage**, Processing kept after a reload, then Paid by itself;
  - the switch removes the pin on the driver phone in under 1 s;
  - price saved;
  - an invalid schedule is rejected and **not saved**;
  - the preset;
  - after saving tomorrow as 10:00–14:00, the driver's booking sheet offers **exactly** 10:00–13:30;
  - the PIN rule, history, the account, and the empty state.
- Screenshot self-review: done. Fixed: the error state on the time selects hid their dropdown arrows (`.input.invalid` now sets only `background-color`).

## Screenshots (in Claude outputs1/screenshots/S6/)
| File | Shows |
|---|---|
| 01-earnings.png | Balance card, week chart, pending |
| 02-transaction-expanded.png | HK$30.00 − 5.40 − 0.90 = HK$23.70 |
| 03-pending-escrow.png | "Released after the session" |
| 04-withdraw-sheet-fps.png | Withdraw: FPS pre-filled |
| 05-withdraw-validation.png | Bank account number error |
| 06-withdraw-success.png | "On its way" |
| 07-payout-processing.png / 08-payout-paid.png | Payout badge Processing → Paid |
| 09-my-spots.png | Spots with switches |
| 10-manage-price.png | Price HK$28, "you receive about HK$22.12" |
| 11-scheduler-default.png / 12-scheduler-error.png / 13-scheduler-weekday-preset.png | Scheduler states |
| 14-access-section.png | PIN + instructions |
| 15-requests-history.png | History list |
| 16-earnings-empty-new-owner.png | Empty state |
| 17-presenter-session-ends-balance-moves.png | Driver "Session complete", owner Available HK$117.71 |

## Known bugs / risks
- In Playwright, the switch inputs report "not stable", so the checks toggle them with `force`. Real taps work, and the checks still assert the outcome (pin removed, stored state). The cause isn't clear.

## Decisions made
- Payout status is derived from `createdAt` (it isn't rewritten in the DB), so it survives a reload, as the task suggests.
- The week chart counts a booking on the day its session completed (`completedAt`).
- The withdraw amount is always the full available balance (no partial withdrawals), which keeps the demo simple.

## Needs a human
- Check that the commission maths reads well on the projector. It's the business-model slide in the demo.

## Commits & deploy
- f50875e, 3107e55, 65dccda, plus this one ("S6: select arrow fix, shots, report"). Deploy: see PROGRESS.md.
