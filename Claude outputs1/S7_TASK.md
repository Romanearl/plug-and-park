# S7_TASK — Owner onboarding + every "No" branch + state sweep

Read `CLAUDE.md` first and follow the autonomous run protocol.

**Diagram steps covered (D3):** "Register an account" → "Fill in application to become an app partner with charging spot photos and information" → "Approve application?" (No → back to the application) → "Request access codes and payment information" → "Provide access code and payment information" → "Add charging spot to the platform, set up owner's account with ability to receive payments" → "Update access codes, photos, etc. when needed" (built in S6).

## 1. Data
- Add to `Spot`: `reviewStatus: 'approved' | 'in_review' | 'changes_requested'` (seeded spots are `approved`) and `reviewNote?: string`. Only `approved` **and** `active` spots appear on the driver's map. Bump `DB_VERSION`.
- Add to `User`: `payoutMethod?: { type: 'FPS' | 'Bank transfer'; label: string }` (masked label only). Reuse it in the S6 withdraw sheet.

## 2. New-owner home
An owner with no spots sees, in place of the Requests list, a welcome card: "List your charger and earn while you're at work", three short benefit lines (earn HK$20–35 per hour · you approve every booking · paid out by FPS), and a black **"List my charger"** button → `#/owner/apply`.

## 3. Application `#/owner/apply` — three steps with a progress bar ("Step 1 of 3")
The draft is saved after every step (in the DB as a spot with `reviewStatus: 'in_review'` not yet submitted, or in sessionStorage), so a reload doesn't lose it.

**Step 1 — Your bay**
- Title (5–60 characters), address (5–120), district (a select of the 10 districts), property type (four selectable cards: Village house, Industrial building, Commercial bay, Residential estate).
- **Location:** a small map (200px tall) centred on the chosen district with a draggable pin, and the line "Drag the pin to your bay". Changing the district re-centres it. Keep district centre coordinates in one table.

**Step 2 — Your charger**
- Connector type (four chips), power in kW (a select: 7, 7.4, 11, 22, 40, 50, 60), price per hour (HK$20–35, the same control as S6, with the "you receive about…" line), amenities (multi-select chips).
- A tip line: "Similar bays in Sai Kung charge HK$23–25" (the average of approved spots in that district; hidden if there are none).

**Step 3 — Photos and hours**
- **Photos:** three tiles. Tapping an empty tile opens the file picker (`accept="image/*"`). The chosen image is resized in the browser to at most 800px and stored as a compressed JPEG data URL (cap about 120 KB each; if storage fails, fall back to a generated illustration and say so). A "Use sample photo" link fills the tile with a generated illustration instead, for the live demo. At least one photo is required.
- **Hours:** the S6 scheduler component, preset to "Weekdays 08:30–19:00".
- A checkbox: "I confirm I have the right to rent out this bay" (required).

**Submit** → the screen "Application received", with a three-step timeline: Submitted (done) → **Under review by Plug & Park** (current) → Go live. The spot is saved as `in_review` and isn't on the map.

## 4. The platform's decision (the "Approve application?" diamond)
The platform lane is simulated from the **demo sheet**, in a new section "Platform (admin) actions" that lists applications in review, each with **Approve** and **Request changes**.
- **Request changes (the No branch):** set `changes_requested` with a note ("Please add a clearer photo of the charger"). The owner sees an amber card with the note and "Edit application", which reopens the form pre-filled; resubmitting returns it to `in_review`.
- **Approve (the Yes branch):** the owner gets a toast and a card "You're approved — one last step", leading to **Finish setup** `#/owner/setup/:spotId`:
  - the gate **PIN** (4 digits) and access instructions (the diagram's "Provide access code")
  - the **payout method** (the FPS / bank fields from S6; the diagram's "payment information")
  - **"Go live"** → the spot becomes `approved` and `active`, appears on the driver's map **live**, and the owner lands on My spots with a "Your charger is live" toast.
- All of this must work across the two phones in the presenter view, with the demo sheet opened on the owner phone.

## 5. Branch triggers — make every "No" in the diagrams reachable on purpose
Add a section "Show a 'No' branch" to the demo sheet with a one-line hint for each (text only, no extra logic unless noted):
- **Spot unavailable** — "Book Kwun Tong tomorrow at 10:00" (S4).
- **Owner declines** — "Decline the request on the owner phone" (S4).
- **Payment fails** — "Pay with 4000 0000 0000 0002" (S5).
- **Application needs changes** — "Use Platform actions below" (this session).
Add a check that drives each of the four branches end to end.

## 6. State sweep — go through **every** screen built so far
For each screen, make sure these exist and look finished, and fix what's missing:
- an **empty state** with a one-line explanation and an action
- a **loading state** for every simulated wait (availability check, payment, access verification, payout)
- an **error state** for every form, and for a booking, spot or route id that doesn't exist
- behaviour after **Reset demo** while on that screen (no crash, lands on `#/`)
- behaviour when the signed-in user was removed by a reset in another window (signed out cleanly)
- double taps on every action button create nothing twice (disable while working)
- long names and addresses wrap or truncate with an ellipsis instead of breaking the layout

List the result per screen in the report as a table (screen · empty · loading · error · fixed in this session).

## Shots (`Claude outputs1/screenshots/S7/`)
New-owner welcome · apply step 1 · step 1 errors · step 2 · step 3 with photos · application received · platform actions in the demo sheet · changes requested card · finish setup · go-live toast on My spots · the new spot's pin on the driver map · the "No" branch section · two or three of the newly added empty or error states.

## Done when
- [ ] A newly registered owner can go from sign-up to a live pin on the driver's map: apply → approve in the demo sheet → finish setup → go live.
- [ ] "Request changes" returns the owner to a pre-filled form, and resubmitting works.
- [ ] A spot in review can't be seen or booked by drivers.
- [ ] The application draft survives a reload on each step; every field validates.
- [ ] All four "No" branches pass their end-to-end checks.
- [ ] The state sweep table is in the report with no open gaps.
- [ ] `npm run check` passes for S1–S7.
