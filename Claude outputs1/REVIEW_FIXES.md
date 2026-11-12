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

---

## Review of RF-4 to RF-10 — 12 Nov 2026: approved, with RF-11 to RF-13

Checked `RF4-10_REPORT.md`, the new `DEMO_SCRIPT.md` and 5 screenshots (map default, presenter view, payment buttons, slot suggestions, district preview). All seven fixes are done as asked, and the deviations are accepted (extra tap before Withdraw, wider pan limits, the Firefox test workaround). The older S1, S2 and S6–S9 session screenshots don't need re-shooting.

### RF-11 — Demo script wording (docs only)
- **3:55 row, "What to say":** the "at work" line was the reviewer's mistake, since this bay is open every day. Replace it with: "Owners set the weekly hours when their bay is free, and block out the times they need it themselves." Use the same idea in the short version. Don't change the seed data.
- **3:55 row, "Flow-diagram step":** availability isn't a step in diagram 3. Change the cell to "Proposal: availability scheduler".
- Check that `README.md` and `SCREENS.md` only link to regenerated images (none with the old, darker map).

### RF-12 — Overlapping pins on the all-Hong-Kong view
After RF-4 the opening map sits at zoom 10, and four pairs of pins now overlap so that one price in each pair is partly hidden ($22/$20, $26/$32, $25/$23, $28/$30). This is the first thing the class sees on the driver phone.
- When two or more pins would overlap on screen, **merge them into one group pin**: the same black pill, showing the count and the lowest price, for example "2 · from $23". Recompute on zoom, on pan end and when the filters change.
- Tapping a group pin zooms the map to fit its members (zoom cap 15), where they show as separate price pins. A selected spot is always shown as its own pin.
- The sheet's count and list are unchanged ("12 chargers nearby" stays 12).
- Keep integer zoom levels. Don't move the spots' coordinates and don't change the tile provider.
- Update the S3 checks: at every zoom level no two pins overlap, every spot is reachable from the map within two taps, and the demo path (district search → the $30 pin) is unchanged.
- **If this isn't clean after one solid attempt, back it out, leave the map as it is now and say so in the report.** A working map with overlaps beats a clever one with a bug.

### RF-13 — Superseded
Don't do a separate re-verify after RF-12. Do RF-14 next; RF-15 is the single re-verify for RF-11, RF-12 and RF-14. Record RF-13 as "superseded by RF-15" in `PROGRESS.md`.

---

## New colour system — 12 Nov 2026 (Roman's decision): RF-14 and RF-15

Roman has chosen a new colour scheme: a **navy base**, **sky blue** and **mint** as two accents, and a **dark map**. The layout, type, spacing and every flow stay exactly as they are. Only colours change. `CLAUDE.md` §6 (master copy) is already updated; sync the root copy first.

### RF-14 — Apply the new colour system

**The rule that decides every case:**
- **Navy** is the base: text, primary buttons, large dark surfaces.
- **Sky blue means "selected" or "tappable"**: the thing you chose, or a link.
- **Mint means "live"**: energy, availability, status and money coming in.
- Neither accent ever carries white text, and neither is used as text on a light background. Use the `-deep` variant for that.

**1. Tokens** (`:root` in `src/styles/app.css`). Replace the old values; every colour in the app must come from a token.

```css
--ink: #102A43;  --ink-2: #1B3A57;  --ink-3: #2A4A68;   /* Midnight Navy; replaces pure black */
--muted: #55657A;  --muted-2: #7C8A9A;                  /* muted-2 is for large or non-essential text only */
--line: #E1E7ED;  --surface: #F4F7FA;  --surface-2: #E9EEF3;  --bg: #FFFFFF;

--blue: #68A8E8;       /* fill for selected things — navy text on it (5.8:1) */
--blue-deep: #2B66A8;  /* blue text, icons and focus rings on light backgrounds (5.9:1) */
--blue-tint: #E8F1FC;
--blue-ink: #102A43;

--mint: #4EE4B6;       /* fill for live things — navy text on it (9.1:1); as-is on navy (9.1:1) */
--mint-deep: #0A6B50;  /* mint-family text and icons on light backgrounds (6.5:1) */
--mint-tint: #E3FBF3;

--success: #0A6B50;  --success-tint: #E3FBF3;   /* success now belongs to the mint family */
--danger: #D6342C;   --danger-tint: #FDECEA;    /* unchanged */
--warning: #A35F00;  --warning-tint: #FFF4E0;   /* unchanged */
```

- Find hard-coded colours outside the token block (`#000`, `#fff` on accents, `#7399c6`, `#3e5f8a`, `#0e8345`, rgba blacks used as fills) and replace them with tokens. Illustrations may keep literal colours, but recolour them from this palette.
- The **phone frame hardware stays black**: bezel, dynamic island, home indicator on light screens. The stage gradient stays as it is.

**2. Navy base.** Everything that was black becomes navy through `--ink`: text, primary buttons, the landing screen, the charging session screen, the owner's balance card, toasts, the active state of switches. White text on navy stays white.

**3. Sky blue = selected or tappable.**
- Selected choices: filter chips, day chips, time slots, duration chips, role cards, segment toggles, the selected payout method. Fill `--blue`, text `--ink`. (These were black with white text.)
- Tab bars: the active tab's icon and label in `--blue-deep`.
- Links and text buttons: `--blue-deep`. Input focus border: `--blue-deep`.
- The bottom sheet's handle: `--blue`.
- Finished steps in the booking stepper and the onboarding progress bar: `--blue`.
- The wordmark box stays `--blue`, but its text becomes `--ink` (white on sky blue is only 2.5:1). Regenerate the favicon and app icons to match. Roman is designing a final logo separately, so keep the wordmark in one component and the icons in one place, easy to swap later.
- **Not blue:** primary buttons and switches (navy), anything about status, energy or money (mint).

**4. Mint = live.**
- **Map pins:** mint pill, navy price text, 1.5px navy border. Group pins from RF-12 use the same style. The **selected pin** is a white pill with navy text and a navy border, slightly larger, with a soft shadow.
- **Availability and status:** "Open now", "Available", "Paid", "Completed", "Live", "Charging now" badges use `--mint-tint` with `--mint-deep` text on light screens, and `--mint` on navy.
- **Charging session** (navy screen): the progress ring, the live dot and the battery figure accents in `--mint`.
- **Progress bars** of any kind that show something happening now: `--mint`.
- **Money coming in:**
  - On the navy balance card, the amounts are `--mint`.
  - On white, "You earn HK$23.70", the net amount in transaction rows and "You receive" in the breakdown are `--mint-deep`.
  - In the weekly chart, today's bar is `--mint` with a 1px `--mint-deep` outline, the other bars `--surface-2`, and value labels `--ink`.
- **Success moments:** the check circles ("You're booked!", "Approved!", review thanks, payout sent) are `--mint` with a navy check. The "Approved!" card background is `--mint-tint`.
- **Landing illustration:** the charger pins and their glow in `--mint`, the featured pin `--mint` with a navy bolt.
- **Never** mint or sky blue as text on white or on `--surface` (1.6:1 and 2.5:1).

**5. Dark map.**
- Keep the same tile provider. Change only the tile filter (`--map-filter`) so the map is dark: start from `grayscale(1) invert(1)` and tune brightness and contrast. If a plain dark grey looks off beside the navy UI, add a navy tint (for example a navy overlay pane with a blend mode), as long as tiles stay crisp.
- Target: the map background is close to `--ink` but clearly lighter than the phone bezel; roads are visible; district and street names are readable when zoomed in; nothing on the map is as bright as a pin.
- The map container's own background (seen while tiles load or fail) is navy, not light grey.
- Top overlay on the map: the search pill and chips stay white with navy text; replace the white fade behind them with a navy fade or remove it. The attribution stays readable.
- The mini map in owner onboarding uses the same dark style.
- **Projector safety switch:** add "Map style: Dark / Light" to the demo sheet (default Dark). Light uses the current light filter. Store the choice in `localStorage` and sync it across windows like the rest of the demo state, so both phones in the presenter view switch together. Pins must look right on both styles (that's why they have a navy border).

**6. Checks and evidence.**
- Add `scripts/checks/contrast.mjs` to `npm run check`: it computes WCAG contrast for the token pairs used for text (ink on bg/surface/surface-2/blue/mint/blue-tint/mint-tint, white on ink/ink-2/ink-3, muted on bg/surface/surface-2, blue-deep and mint-deep on bg/surface and their tints, danger and warning on their tints) and fails under 4.5:1. `--muted-2` is exempt but must not be used for body text.
- Add a check that no pin, badge or button renders white text on `--blue` or `--mint` (sample computed styles on the map, booking sheet, payment, owner requests and earnings screens).
- Update existing checks that assert old colours or class names.
- Save before/after pairs of these screens to `Claude outputs1/screenshots/RF14/`: landing, map (all pins), map with a selected pin, map in Light style, spot details, booking sheet with a slot chosen, booking approved, payment, QR + PIN, charging session, owner requests, owner earnings (top and breakdown), scheduler, presenter view 1280×720.
- Self-review every "after" shot against the rule at the top of this item.

**Don't change:** layout, copy, flows, data, the tile provider, the fonts, or the warning and danger colours.

### RF-15 — Re-verify everything and regenerate the demo kit
After RF-11, RF-12 and RF-14:
1. `npm run typecheck`, `npm run build`, `npm run check` (all files), `npm run smoke` in Chromium, WebKit and Firefox.
2. `npm run shots -- all`, so every session folder shows the new colours.
3. Regenerate the demo kit (`node scripts/demo-kit.mjs`): both videos, 25 phone and 25 framed screens, three flow images, and the QR slide (navy background instead of black).
4. Update wording that names a colour: `DEMO_SCRIPT.md` says "a blue ring" for charging, which is now mint; add a line to its "If something goes wrong" table: "The dark map is hard to see on the projector → Demo strip → Map style → Light". Update `README.md` images and `HOW_IT_WORKS.md` if they mention colours.
5. Push, check the Actions run, smoke-test the live URL, tag `v1.2-demo`.
6. Update `PROGRESS.md` and write `Claude outputs1/RF11-15_REPORT.md`. Under "Needs a human", ask Roman to check the dark map on the classroom projector. Then stop.
