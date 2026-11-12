# Review fixes (written by the reviewer — Claude Code must not edit this file)

Do every open item here **before** continuing with the current session. An item is open until its ID appears under "Review fixes done" in `PROGRESS.md`.

## Review of S1 + S2 — 11 Nov 2026: approved

Checked `S1_REPORT.md` and the S1/S2 screenshots against the task, the design system and the course guidelines. The foundation, landing, phone frame, demo sheet, and the register / login / verification screens match the spec. The deviations listed in the report are accepted (newer tool versions, `aria-disabled` on Continue, the extra role error, hover only on hover devices).

### RF-1 — Report the GitHub state
`S1_REPORT.md` doesn't say whether the repo was created and pushed. Record in `PROGRESS.md`: the repo URL, the live URL, and whether the last Actions run was green. If the repo doesn't exist yet, create it and enable Pages as described in CLAUDE.md §9.

### RF-2 — Ignore the empty `repo/` folder
The empty `repo/` folder in the project root isn't part of the project. Don't delete it (that's Roman's call), but add `repo/` to `.gitignore` so it can never be committed by accident.

### RF-3 — S3 was started without a task file
`S3_TASK.md` now exists. Do a gap pass of whatever S3 work exists against it before moving on to S4.

---

## Review of S3–S10 — 11 Nov 2026: approved, with fixes RF-4 to RF-10

Checked `FINAL_REPORT.md`, `PROGRESS.md`, `S9_REPORT.md`, `DEMO_SCRIPT.md`, `HOW_IT_WORKS.md` and 14 screenshots (the presenter view, the main driver and owner screens, the driver flow image and the QR slide) against the proposal, the three flow diagrams and the grading guidelines. The demo journey covers every step of diagrams 1 and 2, the money figures are correct (HK$30 → 5.40 + 0.90 → 23.70; balance 117.71), and the screens look like one app. Switching to OpenStreetMap tiles is accepted.

The code is frozen, so these are deliberately small. Do them in order, then RF-10.

### RF-4 — The first map view cuts off pins (bug)
On opening the map, one pin is clipped by the right edge of the screen ("$2…") and the Sai Kung pins are off-screen, so "12 chargers nearby" shows fewer than 12 pins.
- On load, on Reset, and whenever the filters change, fit the map to **all pins that match the filters**, with padding for the top overlay (search + chips) and the peek sheet, so no pin is clipped or hidden behind them.
- Cap the zoom so a single result doesn't zoom in further than street level (about zoom 15).
- Check at 390×844 and in the presenter view: count that every matching pin is fully inside the visible map area.

### RF-5 — Make the base map recede (CSS only)
The map background competes with the pins: mountain-peak triangles, ferry lines and labels are as dark as the price pins' surroundings. **Don't change the tile provider.** Only adjust the CSS filter on the tile layer (for example more brightness, less contrast, full greyscale) until the black pins are clearly the first thing the eye lands on, while street names stay readable when zoomed in. Compare before and after screenshots at the default view and at street level.

### RF-6 — "Use declined card" button on Payment
In the live demo the presenter has to type `4000 0000 0000 0002` by hand. Next to "Use test card", add a second small grey button **"Use declined card"** that fills the form with the declined card. Nothing else about payment changes.

### RF-7 — Suggested times should include later slots
When a slot is taken, the suggestions are only earlier times (08:00, 08:30, 09:00 for a 10:00 request). Change `freeSlotsNear` to return up to three free start times closest to the requested one: **the nearest earlier one and the two nearest later ones** (for the demo case: 09:00, 12:00, 12:30), in time order. If one side has none, fill from the other. Update its checks.

### RF-8 — Demo script: show two more features the proposal promises
The proposal lists "filters based on district" and the owner's "availability scheduler" as core features, and neither is in the main demo path. Update `DEMO_SCRIPT.md` (and the smoke path and recordings to match):
- **0:15** — use the district search: tap "Where do you need to charge?" → **Kwun Tong**. Then tap the Hoi Bun Road pin or card. (Mention the charger-type chips in one clause; don't tap them.)
- **Slot step** — after "no longer available", tap the suggested **12:00** (from RF-7) and adjust the following rows.
- **Declined card step** — use the new button from RF-6.
- **After the earnings breakdown** — add a 15-second row: Owner: **Spots** → the Hoi Bun Road bay → **Availability**. Say: "Owners set weekly hours, so the bay is only bookable while they're at work." Don't change anything on that screen.
- Keep the total at 5:00 or less; if it runs over, shorten the charging wait with "Skip charging to the end". Update the short version too.
- Add one line under the script: "Diagram 3 (owner onboarding) is not in the live demo — show `screens/flow/onboarding-flow.png` on a slide and say it works in the app."

### RF-9 — `HOW_IT_WORKS.md`: two claims we can't back up
- "Why 18%?" — remove "of comparable peer-to-peer platforms". Say it's inside the 15–20% range set in our proposal, and keep the rest.
- "How is this different from existing charging apps?" — soften "a supply that isn't on any map today" to "a supply that existing charging apps don't list", and add "(team: confirm against the competitors in our report)".

### RF-10 — Re-verify and regenerate
After RF-4 to RF-9: run `npm run check` and `npm run smoke` (all three browsers), re-run `node scripts/demo-kit.mjs` so the videos, screens and flow images match the app again, push, and run the smoke test against the live URL. Leave the `v1.0-freeze` tag where it is and add a new tag `v1.1-demo` on the final commit. Record all of it in `PROGRESS.md`, then stop.
