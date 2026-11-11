# Plug & Park — Build plan (S1–S11)

**Presentation:** Fri 20 Nov 2026 (Group 2 is in the first batch). **Feature freeze:** Sun 15 Nov, end of day.
**Workflow per session:**
1. Roman gives Claude Code the session's task file.
2. Claude Code builds it, runs typecheck and build, takes screenshots into `Claude outputs1/screenshots/S<n>/`, writes `Claude outputs1/S<n>_REPORT.md`, then stops.
3. Roman brings the report and screenshots to the reviewer (Claude in Cowork).
4. The reviewer checks them against the proposal, flow diagrams and grading guidelines, then writes the next task file (`S<n+1>_TASK.md`) with any fixes first.
5. Roman says "yes", and Claude Code commits and pushes. GitHub Pages redeploys.

Sessions are roughly 1.5–3 h of Claude Code time. If a session overruns, its unfinished items move to the top of the next task file; nothing gets dropped silently.

## Timeline

| # | When | Session | Done when |
|---|---|---|---|
| **S1** | Wed 11 | **Foundation** | `npm run build` passes. The phone frame works (full screen under 520px, framed and scaled at 520px+). Design tokens and component classes are in `app.css`. The store has seed data, cross-window sync and Reset demo. The demo banner and demo sheet work (credentials, one-tap sign in, reset). The Landing screen is finished. Every other route shows a "Coming in Sx" placeholder. Deploy workflow, README skeleton, screenshot script and S1 report all exist. |
| **S2** | Wed 11 (if S1 fits) or Thu 12 AM | **Auth** | Register (role choice, name, email, +852 phone, password rules, confirm, terms) shows live and on-submit validation and catches duplicate emails. Login shows a wrong-password error and has demo shortcuts. Verify (6-box OTP, paste, auto-advance, 30s resend timer, wrong-code error, `123456` passes) signs the user in and routes by role. Sign out works. **First live link goes to the team.** |
| **S3** | Thu 12 | **Discovery** | A full-screen Leaflet map (Carto Positron) shows 12 custom pins (price labels; the selected one turns blue). There are district and charger-type filter chips, a list view toggle and a peek bottom sheet on pin tap. Spot details show a photo carousel (SVG illustrations), price, rating with reviews, charger type and kW, amenities, availability windows, owner name and a "Request booking" CTA. Pin taps work inside the scaled frame. |
| **S4** | Thu 12 | **Booking core** | The booking sheet has a date (today or tomorrow) and start time (from the spot's windows) and duration chips (15m/30m/1h/2h), and shows the live price. The availability check works: a conflict shows "Spot unavailable" (the No branch of diagram 1). Submitting creates a `pending` booking. The booking status screen updates live. The owner dashboard lists incoming requests with driver name, rating and vehicle, with Approve and Decline. **Presenter view** `#/presenter` shows two phones side by side (iframes named `driver`/`owner`, auto signed in) that sync live. **"First slice" update to the team.** |
| **S5** | Fri 13 | **Driver path** | The payment screen does Luhn, future-expiry, 3-digit CVC and cardholder-name checks, with a test-card hint. The `4000…0002` card shows a decline (No branch). It shows a processing spinner, then success. Confirmation shows a QR code + PIN + address + instructions. The charging session simulates progress (battery %, kWh, time left, cost; one demo minute equals about 1 s) with a Finish button. Rate & review (stars + text) updates the spot's rating. My bookings lists upcoming and past bookings. |
| **S6** | Fri 13 | **Owner side** | Earnings: gross, 18% commission, gateway fee and net, per booking and in total. Withdraw to FPS/bank shows a mock payout status (processing, then paid). A weekly availability scheduler edits the windows, and the change shows in the driver's spot details. The owner's spots list has an active toggle. There's a booking history. |
| **S7** | Sat 14 | **Onboarding + branches** | The owner application form (diagram 3) collects spot info, address, district, charger type, price and photo placeholders, ending in "Under review". A demo button approves it (the platform step), then the spot appears on the map. All No branches can be triggered from the demo sheet. Empty, error and loading states are everywhere. |
| **S8** | Sat 14 | **Visual polish** | Consistent spacing, type and motion. Real or free-licence photos are in `public/photos` with credits. Tested on Roman's real phone (iOS Safari and/or Android Chrome). Contrast and tap targets are checked. Optionally an install-to-home-screen manifest. |
| **S9** | Sun 15 | **Hardening — FEATURE FREEZE** | A Playwright **smoke test** runs the full happy path (register, OTP, map, details, request, approve, pay, QR, charge, rate) and passes. If tiles fail, the map falls back to the list. Reset demo is reliable. No console errors. Deep-link refresh works on GitHub Pages. |
| **S10** | Mon 16 – Tue 17 | **Demo kit** | `DEMO_SCRIPT.md` (4–5 min click path with talking points) is written. Screenshots are ready for the slides and the report. The **backup video** (screen recording of the full flow in the presenter view) is recorded. `HOW_IT_WORKS.md`, a one-page plain-language explainer for teammates and the report, is written. A QR code to the live URL is ready for a slide. |
| **S11** | Wed 18 – Thu 19 | **Buffer** | Bug fixes only, team rehearsal on the classroom setup (projector at 1280×720), and a final check of the live URL. |
| — | **Fri 20** | **Present** | |

### If we fall behind: cut in this order
1. Owner onboarding form (S7): show the diagram instead and say it's "next sprint".
2. The availability scheduler becomes read-only.
3. The payout withdraw button becomes a static earnings card.
4. The list view toggle.

**Never cut:** auth with validation, the map, spot details, request → approve → pay → QR → charge → rate, owner approve/decline, the commission display, the presenter view, Reset demo and the backup video.

## Flow diagram → screen mapping (use in the presentation and report)

| Diagram step | Screen | Session |
|---|---|---|
| D1: Search & select a charging spot / platform displays spots with details | Map home, spot sheet, spot details | S3 |
| D1: Select time slot (15m/30m/1h) → submit request | Booking sheet | S4 |
| D1: Charging spot available? **No** → driver notified unavailable | Conflict message in booking sheet | S4 |
| D1/D2: Send request to owner → owner approves? (**No** → notified) | Owner dashboard + booking status | S4 |
| D1: Driver notified booking confirmed → proceed to payment | Booking status → Payment | S4/S5 |
| D1/D2: Payment gateway → successful? (**No** → not confirmed) | Payment (test and decline cards) | S5 |
| D1: Provide access method (QR/PIN) | Confirmation | S5 |
| D1: Go to location, verify arrival, start charging, live charging data, state of charge | Charging session | S5 |
| D1: Session complete → rate & review | Rate screen | S5 |
| D2: Escrow → finalise bill minus 15–20% commission + gateway fee → net payout to bank/FPS | Owner earnings + withdraw | S6 |
| D3: Register → application with photos → platform approves? → access codes and payment info → spot added → update codes/photos | Owner apply + spot management | S7 |
| Proposal: availability scheduler; review requests by driver rating | Owner availability; request cards show rating | S4/S6 |

## Grading checklist (from the course guidelines)

- **Prototype demonstration (6 pts):** show the *core capabilities* live. A smooth end-to-end flow beats breadth. Use the presenter view so both sides are visible.
- **Creativity & feasibility (2 pts):** the commission maths on the owner screen makes the business model concrete.
- **Organisation & delivery (2 pts):** the demo is about 4–5 minutes of a 15-minute talk, follows the script, and has the backup video ready.
- **Report (Dec 4):** "introduce your app using prototype screens", so the S10 screenshots go here.
- **Collaboration details:** record that Roman built the prototype. Teammates own the slides, business and revenue, competitors, marketing campaign and demo data/photos.

## Demo click path (draft — finalised in S10)
1. Landing → register as driver (show a validation error once) → OTP `123456`.
2. Map: filter "CCS2", tap the Kwun Tong pin, open the details.
3. Request 1 h tomorrow at 10:00. That slot is taken, so it shows "unavailable" (No branch). Pick 13:00 instead and submit (pending).
4. Owner phone: the request card shows driver rating 4.9. Approve, and the driver's phone flips to "Confirmed" live.
5. Pay with 4242 → QR + PIN → start charging (sped up) → finish → 5-star review.
6. Owner phone: earnings update. HK$30 gross − 18% commission = net. Tap Withdraw to FPS.
7. Close: Reset demo, and the QR on the slide so classmates can try it themselves.
