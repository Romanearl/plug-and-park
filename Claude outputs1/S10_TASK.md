# S10_TASK — Demo kit (last session — then stop)

Read `CLAUDE.md` first and follow the autonomous run protocol.

The code is frozen (`v1.0-freeze`). This session produces what the team needs to **present** the prototype and write the report. Code changes are limited to bug fixes found while recording. When this session is done, write `FINAL_REPORT.md` and **stop for good** — don't start anything else.

Everything for the team goes in `Claude outputs1/demo-kit/`. Write in plain English that a business student with no coding background can follow.

## 1. `DEMO_SCRIPT.md` — the live demo, 4 to 5 minutes
The presentation is 15 minutes in total, so the demo has to be tight. A table with one row per step: **time mark · what to click (exact button and field names) · what the audience sees · what to say (one or two sentences) · which flow-diagram step it shows**.
- Use the presenter view (two phones). Start from a fresh Reset.
- Follow the click path in `PLAN.md` ("Demo click path"), corrected to match the app as built.
- Show exactly **two** "No" branches (slot unavailable, card declined) — they prove the diagrams' decision points without eating time.
- Include the business-model moment: the owner's breakdown (HK$30.00 − 18% − 3% = HK$23.70) and the Withdraw tap.
- End with the QR code slide so classmates can try it on their own phones.
- Add a **"Before you start" checklist** (open the live URL, Reset demo, presenter view, zoom level, Wi-Fi, the backup video open in another tab, phone on silent) and an **"If something goes wrong"** table (map doesn't load → use the list; wrong state → Reset demo; no internet → play the backup video).
- Add a 2-minute **short version** in case the group is running late.

## 2. Backup video
- Record the full demo path with Playwright's video recording in the presenter view at **1280×720**, paced for a human viewer: pause 1–2 seconds after each change, type at a readable speed, and move slowly enough to follow. Target length 2.5 to 4 minutes.
- Show where each tap lands (inject a small visible touch-dot overlay for the recording only — it must not ship in the app).
- Save it as `demo-kit/backup-demo.webm`. If `ffmpeg` is available, also produce `backup-demo.mp4` (H.264), which PowerPoint plays more reliably; if not, say so under "Needs a human" with the one command Roman can run.
- Also record a **single-phone** version of the driver's path (390×844), for use in slides: `demo-kit/driver-flow.webm`.
- Watch the result frame by frame at a few points (extract frames) to confirm nothing is blank, cut off or mid-animation at the wrong moment.

## 3. Screenshots for the slides and the report
The report must "introduce the app using prototype screens". In `demo-kit/screens/`:
- `phone/NN-name.png`: every main screen at 390×844 (2× scale), in flow order, clean demo data.
- `framed/NN-name.png`: the same screens inside the phone bezel on a **transparent** background (render the device frame alone), ready to drop onto a slide.
- `flow/driver-flow.png`, `flow/owner-flow.png`, `flow/onboarding-flow.png`: one wide image each with the phone screens side by side in order, with arrows and short captions, matching the three flow diagrams.
- `SCREENS.md`: a table of file → screen → flow-diagram step → one-sentence caption that can be pasted into the report.

## 4. `HOW_IT_WORKS.md` — one page for teammates and for Q&A
- What the prototype is, and honestly what is **simulated** (login codes, payments, charger data, payouts, the platform's approval) versus **real** (form validation, booking logic and conflict checks, commission maths, the live two-phone sync, the map).
- How it would work in a real product, one line per simulated part (payment gateway, charger data over OCPP, SMS codes, a backend and database, bank/FPS payouts).
- The business numbers the app uses: price range HK$20–35/hour, 18% commission (within the 15–20% of the proposal), 3% payment fee, and a worked example.
- Likely questions from the class with short answers (How do you handle an owner who doesn't reply? What if a driver overstays? How is the charger access secured? Why would owners trust strangers? How does this differ from existing charging apps?). Mark any answer that is a product idea beyond the prototype as such.
- Credits for tools and data: OpenStreetMap and CARTO map tiles, Leaflet, Inter and Libre Caslon Text, and that the prototype was built with AI assistance (the course allows it).

## 5. README — final version
- The wordmark, the one-line pitch and the **live demo link** at the very top, with a **QR code** image (`docs/qr-live-demo.svg` and a PNG) pointing to the live URL.
- A short animated preview or 4–6 screenshots of the key screens.
- "Try it in 30 seconds": the demo logins, the code `123456`, the test card and the declined card, and the presenter view link.
- The table mapping each flow-diagram step to a screen (from `PLAN.md`), with a screenshot link per row.
- What's simulated versus real (short).
- The tech stack, how to run it locally, and the folder structure in five lines.
- Photo and tile credits.
- The team: "Group 2, IIMT 2601 (HKU)" — leave the member names as a clearly marked TODO for Roman.
- The "Demo only — no real payments" notice.

## 6. A QR code slide asset
`demo-kit/qr-slide.png`: 1920×1080, black background, the wordmark, "Try it now", the QR code large enough to scan from the back of a room, and the short URL in text under it.

## 7. `FINAL_REPORT.md` (in `Claude outputs1/`)
- What was built, session by session, in a short table.
- Anything skipped or cut, and why.
- The full "Needs a human" list in one place: real-phone tests, the projector check, adding real photos, team names in the README, converting the video if it wasn't possible.
- The live URL, the freeze tag and commit, and the result of the last smoke test.
- Known limitations to be honest about in Q&A.

Then mark S10 done in `PROGRESS.md`, commit, push, check the deploy — and **stop**.

## Done when
- [ ] `DEMO_SCRIPT.md` matches the app click for click (verify by running the smoke path while reading it).
- [ ] Both videos exist, play, and show the complete flow at a watchable pace.
- [ ] The three screenshot sets and the three flow images exist and use fresh demo data.
- [ ] `HOW_IT_WORKS.md` separates simulated from real accurately.
- [ ] The README's live link and QR code point to the working live site.
- [ ] `FINAL_REPORT.md` is written, everything is committed and pushed, the deploy is green.
