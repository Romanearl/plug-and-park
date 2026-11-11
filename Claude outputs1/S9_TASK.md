# S9_TASK — Hardening and FEATURE FREEZE

Read `CLAUDE.md` first and follow the autonomous run protocol.

No new features. The goal is that the live demo cannot fail in front of the class. After this session the code is frozen: only bug fixes from `REVIEW_FIXES.md` are allowed.

## 1. Smoke test — `npm run smoke` (`scripts/smoke.mjs`)
One Playwright script that runs the **exact demo path** against the production build, with two pages in one browser context (driver and owner), and fails loudly on any console error:
1. Reset. Register a **new** driver (one validation error first, then valid) → OTP `123456` → map.
2. Filter `CCS2`, select Kwun Tong, open details.
3. Request tomorrow 10:00 for 1 h → "no longer available" → pick a suggested time → pending.
4. Owner page: the request appears live with the driver's rating → Approve.
5. Driver page: flips to Approved without a reload → pay with the declined card (error) → pay with 4242 → QR and PIN shown.
6. Start charging → progress moves → completes → 5-star review → the spot's review count rises.
7. Owner page: the net amount is in Available → Withdraw by FPS → payout turns Paid.
8. The same path once more through the **presenter view** iframes at 1280×720.
Also run the four "No" branch checks from S7 and the new-owner onboarding path.

Run the whole smoke test **five times in a row**. It must pass every time; fix any flakiness in the app (not by adding sleeps to the test).

## 2. Failure drills (each gets a check)
- **Map tiles blocked:** the list fallback appears and the whole path still works.
- **Google Fonts blocked:** the app is readable in the fallback fonts with no layout breakage.
- **Fully offline after load:** every screen except the map tiles keeps working (there's no backend, so it should).
- **Storage blocked or full:** the app runs in memory for the session and shows one small notice; no crash.
- **Corrupt stored data:** garbage in `pp.db` re-seeds cleanly.
- **Old data version:** a `pp.db` with an older `version` re-seeds without an error.
- **Reset demo** from every screen, in each window, during a pending request, a payment in progress and an active session.
- **Refresh (F5)** on every route, including with a bad id, on the built site under `/plug-and-park/`.
- **Browser Back** through the whole flow: it never re-opens the payment form after paying, never re-submits anything, and never lands on a blank screen.
- **Two windows as the same user:** actions in one are reflected in the other without duplicates.
- **Clock edges:** booking near midnight, a spot that's closed today, and a session started just before the closing time — no negative times or "NaN".
- **Fast double taps** on Request, Approve, Pay, Start, Submit review and Withdraw create exactly one result.

## 3. Cross-browser
Run the smoke test in Playwright's **Chromium, WebKit and Firefox** (install the browsers if needed), at 390×844 and inside the frame at 1280×720 and 1920×1080. WebKit matters most: it's the closest thing here to the iPhone's Safari. Fix what differs (100dvh, safe areas, input zoom on focus — inputs must be at least 16px — and scroll-snap).

## 4. Live site
- After pushing, run the smoke test once against the **live GitHub Pages URL** (add a `--url` option).
- Check a hard refresh on three deep links there.
- Confirm the Actions workflow is green and takes a reasonable time; add `npm run typecheck` and `npm run check` to the workflow only if they add under about 3 minutes. Otherwise leave the workflow as build-and-deploy.

## 5. Code health (light touch — no rewrites)
- Remove dead code, unused components, leftover `console.log` calls and the last "Coming soon" placeholders.
- `npm run typecheck` with zero errors; no `any` or `@ts-ignore` unless a one-line comment says why.
- The README's "run locally" steps work on a clean clone (`npm ci`, `npm run dev`, `npm run build`). Verify this for real in a temporary copy of the repo outside the project folder, then delete the copy.

## 6. Freeze
- Tag the frozen commit: `git tag v1.0-freeze` and push the tag.
- Record in `PROGRESS.md`: the tag, the commit, the live URL, and the date and time of the last green smoke test on the live site.

## Shots (`Claude outputs1/screenshots/S9/`)
The fallback and failure states (tiles blocked, fonts blocked, storage notice), the presenter view at 1280×720 and 1920×1080, and the WebKit versions of the six main screens (landing, map, spot details, payment, session, owner earnings).

## Done when
- [ ] `npm run smoke` passes 5 times in a row locally, in all three browsers, and once against the live URL.
- [ ] Every failure drill has a passing check.
- [ ] No console errors or warnings in the whole demo path, apart from blocked network requests in the drills.
- [ ] No placeholder screens remain.
- [ ] A clean clone builds and runs from the README.
- [ ] The tag `v1.0-freeze` is pushed and recorded in `PROGRESS.md`.
