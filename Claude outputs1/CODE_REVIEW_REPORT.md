# Code review report — Plug & Park          Date: Fri 13 Nov 2026

Task: `CODE_REVIEW_TASK.md` · reviewed commit `42e20bb` (v1.2-demo + 1) · final tag **`v1.2.1-review`**

## Summary
- **The demo path is safe.** The scripted demo passes 10/10 in the presenter view at 1280×720, in Chromium, WebKit and Firefox on a phone-size screen, in three time zones, and on the live site.
- One bug could have bitten the live demo (CR-01): after clicking into a form field, a click on **Use test card**, **Use declined card** or **Demo driver** was often lost. Fixed.
- No P0. No security or privacy problem: no card number, expiry, CVC or bank account number is ever stored, and no secrets are in the repo or its history.

| Severity | Found | Fixed | Not fixed |
|---|---|---|---|
| P0 | 0 | – | – |
| P1 | 1 | 1 | 0 |
| P2 | 8 | 8 | 0 |
| P3 | 12 | 3 | 9 (listed below) |

Nothing about colours, layout, copy or the logo changed. Proof for the one CSS change (CR-09): every element's position was compared with and without the rule on 96 screen states at 390, 375 and 320 px wide, and all 96 were identical (`scripts/review/wrapdiff.mjs`).

## Findings — fixed
Every fix has checks in `scripts/checks/review.mjs` (30 checks, part of `npm run check`). Each check was also run against the old code and failed there, except CR-07, which needs the dev server.

| ID | Sev. | Area | Where | What happened | How to reproduce (old code) | Commit |
|---|---|---|---|---|---|---|
| CR-01 | P1 | Forms | `src/lib/useForm.ts` | A field's error appeared the moment it lost focus, which pushed the buttons below it down while the mouse button or finger was still down. The press ended on another element, so the tap did nothing. | Payment: click into **Card number**, then click the middle of **Use test card** — nothing is filled, an error appears. Same on Log in with **Email** → **Demo driver**, and **Password** → **Forgot password?**. Mouse and touch. | `6ffa7b9` |
| CR-02 | P2 | Router | `src/lib/router.tsx` | A link with a broken %-escape crashed the whole app: blank page, "URI malformed". | Open `#/app/spot/%E0%A4%A`. | `0c15f97` |
| CR-03 | P2 | Storage | `src/lib/store.ts` | Stored data with the right version number but the wrong shape was accepted. Every load then crashed, and Reset demo could not be reached. | In the console: `localStorage.setItem('pp.db','{"version":5}')`, then reload. | `9419b9e` |
| CR-04 | P2 | Storage | `src/lib/store.ts` | Two windows saving at almost the same moment: the second wrote its own older copy of the data and silently dropped the first one's change. | Delay the owner window's `storage` events, create a booking on the driver phone, then flip a switch on the owner phone: the booking is gone. | `6fe8092` |
| CR-05 | P2 | Map | `src/screens/driver/MapHome.tsx` | The "OpenStreetMap" credit on the map opened in the same window. In the presenter view a stray click would replace a phone with a page that refuses to load in a frame. | Presenter view → click "OpenStreetMap" at the bottom of the driver's map. | `d86ddcb` |
| CR-06 | P2 | Sheets | `src/components/BottomSheet.tsx` | An open sheet pulled the focus back to its Close button every time the screen behind it re-rendered, for example when the other phone saved something. Typing was lost, and Space or Enter could close the sheet. | Owner: Earnings → Withdraw, start typing an FPS ID; change anything in another window; keep typing. | `57c01d0` |
| CR-07 | P2 | Payment | `src/screens/driver/Payment.tsx` | With `npm run dev` the payment never finished: "Processing…" stayed forever (React's dev-mode double mount). The live site was not affected. | `npm run dev` → pay with the test card. | `00897ed` |
| CR-08 | P2 | Router | `src/lib/router.tsx` | After the browser's own Back button, the in-app back arrow could leave the app, because a plain counter drifted. The depth is now kept in each history entry, so it also survives a reload. | Open `#/login` directly → Demo driver → Log in → browser Back → the in-app **←**: the app is gone. | `80797f3` |
| CR-09 | P2 | Layout | `src/styles/app.css`, `SpotDetails.tsx` | A name, title or address typed as one very long word ran off the right edge of the screen. | Register with a 40-letter name without spaces; see owner Requests. Before/after in `screenshots/REVIEW/`. | `39f2918` |
| CR-12 | P2 | Map | `src/screens/driver/MapHome.tsx` | Leaving the map in the middle of a zoom animation threw "Cannot read properties of undefined (reading '_leaflet_pos')" (found by the monkey). Nothing visible broke, but it is an uncaught error. | Pick a district, then tap **Account** within 0.2 s. | `fad8711` |
| CR-10 | P3 | Auth | `src/screens/auth/Verify.tsx` | "Signing you in…" stayed forever when the account had disappeared, for example after a demo reset in another window. | Log in as a self-registered user, reset the demo in another tab, then enter the code. | `69000fa` |
| CR-11 | P3 | Payout | `src/lib/money.ts` | An 8-digit FPS mobile number starting with 852 was refused, because "852" was taken for the area code. | Withdraw → FPS ID `8521 2345`. | `a3cce60` |
| — | P3 | Tooling | `scripts/smoke.mjs` | The smoke test could not run in another time zone. Added `--tz`. | — | `3360385` |

## Findings — not fixed (all P3)
| ID | Area | Where | What | Why not |
|---|---|---|---|---|
| N-1 | Copy | `BookingSheet.tsx:180` | A start time that slipped into the past while the sheet was open is refused correctly, but the message says it "is already booked". | Copy change; see Proposals. |
| N-2 | Data | `src/data/seed.ts` | Demo dates are relative to when the data was first created. A browser that opened the site days ago shows old dates until **Reset demo**. | By design; the demo script starts with Reset. See Proposals. |
| N-3 | Booking | `BookingSheet.tsx:28` | The seven day chips are worked out once per visit to the spot page. Left open across midnight, "Today" is yesterday until the page is reopened. Past times are still refused. | Needs the page open across midnight; the fix touches the demo-path sheet. |
| N-4 | Onboarding | `Apply.tsx` (PhotoTile) | Adding two photos within the same half second can drop the first one; choosing the same file twice in a row does nothing. | Not on the demo path; needs a small refactor of the draft state. |
| N-5 | Auth | `Login.tsx:31` | Leaving the Log in screen within 0.45 s of pressing Log in still jumps to the code screen. | Harmless; a fix would add timer plumbing. |
| N-6 | Auth | `auth.ts:65` | If the same new email is registered in two windows at once, the second one signs in to the first one's account. | Simulated auth; needs two windows and the same email. |
| N-7 | Rules | `bookingActions.ts` | `approveBooking` and `declineBooking` don't check who the owner is, and a paid booking can be started at any time. | The screens only offer these to the right owner; "start now" is deliberate for the demo. |
| N-8 | Map | `MapHome.tsx:70` | "Open now" labels refresh only when the screen re-renders, so they can be a few minutes old. | Cosmetic. |
| N-9 | Privacy | git history | Every commit carries Roman's personal Gmail address as the author, and the repo is public. | Only Roman can decide; see Needs a human. |

Also checked and found fine: status transitions are guarded; slot conflicts (exact overlap, back-to-back, crossing a window's end); the 18% + 3% split always adds up to the gross and the balance can't go negative; Luhn, expiry and CVC rules; double taps on every action button; route guards for both roles and unknown ids; user text is always rendered as plain text; the one `dangerouslySetInnerHTML` holds a constant; external links use `rel="noopener noreferrer"`; the Vite base path, the manifest paths and the workflow permissions.

## The time-zone rule
**Always the device's local time.** The app never converts to Hong Kong time. The demo data is created relative to "now" on the device, bookings are stored as exact instants, and opening hours are compared with the device's wall clock.

Why: the prototype has no server, both demo phones run on the same laptop, and a classmate who scans the QR code from anywhere sees a demo that looks current ("tomorrow 10:00" is their tomorrow). Converting to Hong Kong time would make the blocked 10:00 slot land on a different hour for anyone outside Hong Kong.

No place breaks the rule. Checked in Asia/Hong_Kong, Europe/Moscow and America/Los_Angeles: seeded dates, "Open now", Today/Tomorrow, the blocked 10:00 slot, the charging timer and payout timing. Clock edges at 23:55, 00:05, 21:20 and 21:50 also behave correctly; the only wrinkle is N-1.

## Proposals (not done)
1. **N-1 wording:** when the chosen start time is in the past, say "That time has passed. Choose a later one." instead of "already booked".
2. **N-2 stale demo data:** when the stored demo data is more than a day old and untouched, re-seed it on load. This is a behaviour change, so it needs the reviewer's OK.
3. **Reserve one line under each form field for its error**, so nothing moves when an error appears. CR-01 fixes the lost taps without this, but it would also stop the small jump. It changes spacing, so it is a design decision.
4. **N-3 / N-4:** small refactors of the booking sheet's day list and the application's photo state.

## Checks
| Command | Before | After |
|---|---|---|
| `npm run typecheck` | pass (1.3 s) | pass |
| `npm run build` | pass, no warnings | pass, no warnings |
| Bundle | index 404.34 kB · spots 153.27 kB · MapHome 13.76 kB · Apply 11.96 kB · CSS 46.13 + 15.09 kB | index 405.32 kB · spots 153.27 kB · MapHome 13.86 kB · Apply 11.96 kB · CSS 46.16 + 15.09 kB |
| `npm run check` | 10/10 files, 470 checks (5 min 19 s) | 11/11 files, 500 checks (6 min 6 s) |
| `npm run smoke` Chromium / WebKit / Firefox | pass / pass / pass (119 / 121 / 98 s) | pass / pass / pass |
| `npm run smoke -- --tz` Hong Kong / Moscow / Los Angeles | not possible | pass / pass / pass |
| Live smoke (`--url`) | pass, console clean | pass, console clean |
| Demo ×10, presenter view 1280×720 (`scripts/review/demo10.mjs`) | – | 10/10 locally, 2/2 live, 1/1 live in Moscow time |
| Monkey, 3 min per role, seeds 1 and 2 (`scripts/review/monkey.mjs`) | CR-12 found | 0 problems in 734 + 785 steps |
| Edge drills (`scripts/review/edges.mjs`) | 21 failures | 120/120 |
| 15-minute session (`scripts/review/longrun.mjs`) | – | heap 8.8 MB flat, DOM nodes and listeners flat, no errors |

The edge drills cover: three time zones; clock edges; a hard refresh on every route for each role and signed out, with 16 bad links; browser Back and Forward; hostile input (60-character words, emoji, Chinese, `<script>`, pasted card and phone numbers); full, corrupt and blocked storage; slow 3G and offline after load; WebKit at 375×667 and 430×932 (no overflow, inputs at least 16 px, buttons on screen); double taps; one booking in two tabs; and 20 map round trips with no growth in DOM nodes or listeners.

**Deviation from the task:** the full `npm run check` did not run before every single commit. It ran before CR-01 was pushed, then on the batch CR-02 to CR-11 before that batch was pushed, and again on the final state. Between those, each fix was checked with typecheck, build and `review.mjs`. Nothing was pushed without a full green run of the code it contained, except CR-12, which was pushed after `s3` + `review` passed and was covered by the final full run.

## Needs a human
- **Roman: real iPhone and Android.** Tap into the card number field, then tap **Use test card** (CR-01), and try the keyboard covering the lower fields on Payment and Register. Playwright's WebKit can't show a real keyboard.
- **Roman: the classroom projector** — the dark map, as before.
- **Roman: the commit email (N-9).** The public history shows the personal Gmail address. If that matters, set GitHub's "keep my email address private" for future commits; rewriting the existing history needs a force push, which I am not allowed to do.
- **Reviewer:** the four proposals above.
- `Claude outputs1/screenshots/S8/main-flow.webm` is re-recorded by the S8 check on every `npm run check`, so it shows as changed after each run. It is committed once more with this report.

## Commits & deploy
- 12 fix commits (`REVIEW: CR-01` … `CR-12`), 3 check commits, 2 tooling commits; `git log --oneline v1.2-demo..v1.2.1-review` lists them.
- Pushed: yes · Actions run: green · Live URL checked: yes (smoke, demo ×2, 30/30 regression checks on the live site)
