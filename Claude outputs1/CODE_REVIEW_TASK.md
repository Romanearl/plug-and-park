# CODE_REVIEW_TASK — Thorough code review and debugging

**Start this task only when Roman tells you to** (for example "Start CODE_REVIEW_TASK.md"). It is not part of the session plan, and it does not start automatically after other work.

**Written by:** the reviewer, 13 Nov 2026 · **Presentation:** Fri 20 Nov 2026

## Goal
Find and fix real bugs before the live demo, and leave the code clean and trustworthy. This is a **review and debugging** task, **not** a redesign or a refactor.
- Most important: nothing can break during the 5-minute demo in `demo-kit/DEMO_SCRIPT.md`, in the presenter view or on a real phone.
- Next: every flow in the three flow diagrams behaves correctly, including the "No" branches and edge cases.
- Last: the code is readable enough for a teammate or the instructor to open it on GitHub without finding anything embarrassing.

## Hard limits
- **No design changes.** Colours, layout, fonts, copy and the logo stay exactly as they are. **Do not touch `ON_HOLD_COLOUR_REVERT_TASK.md`** or anything it describes. If a fix would change how something looks, write it in the report as a proposal instead.
- **No new features** and **no large refactors.** A refactor is allowed only when it is the smallest way to fix a real bug, and it must come with a regression check.
- **No new runtime dependencies.** Dev-only tools such as ESLint are fine if they are removed again or clearly isolated. Say which ones you used.
- **Git rules from `CLAUDE.md` still apply.** Commit and push are allowed. Destructive commands (`reset`, `restore`, `stash`, `rebase`, `push --force`, …) are not. Undo with file edits or `git revert`.
- **Never weaken or delete an existing check to make it pass.** Fix the code, or explain in the report why the check itself was wrong.

## Severity scale (use it for every finding)
| Level | Meaning | Action |
|---|---|---|
| **P0** | Breaks the demo path, crashes, loses data, a security or privacy problem (e.g. card data stored), or the live site doesn't load | Fix now, add a regression check |
| **P1** | A flow gives a wrong result (wrong price, wrong status, booking conflict missed, wrong role access), or it fails on a real phone or browser | Fix, add a regression check |
| **P2** | An edge case or polish bug a careful user could hit (odd timer, stale toast, focus lost, layout glitch on one size) | Fix if it is small and safe; otherwise list it |
| **P3** | Code quality: dead code, unclear names, missing comments, duplicated logic | Fix only if trivial and risk-free; otherwise list it |

## Phase 1 — Baseline (record everything before changing anything)
1. `git status` (must be clean), `git log --oneline -10`, the current tag, and the live URL.
2. Run `npm ci`, `npm run typecheck`, `npm run build`, `npm run check` and `npm run smoke` (all three browsers). Record the results and timings.
3. Record the bundle sizes per chunk, and any build warnings.
4. Open the live site with Playwright, run the demo path once, and save the console log. Any error or warning there is a finding.

## Phase 2 — Static review (read the code, file by file)
Go through every file in `src/`, `scripts/` and `.github/`. For each area, check at least these points.

**State and storage (`lib/store.ts`, `data/`)**
- Version handling and re-seeding on version mismatch and on corrupt data.
- Cross-window `storage` sync: race conditions when two windows write at almost the same time, lost updates, and infinite update loops.
- Session per window (`window.name`): what happens inside the presenter iframes, in new tabs and after Reset.
- What is stored: confirm no full card number, expiry, CVC or bank account number ever reaches `localStorage`.

**Business logic (`lib/booking`, `pricing`, `money`, `availability`, `payment`, `validation`)**
- Every status transition is guarded; invalid ones are refused.
- Slot conflicts: exact overlaps, back-to-back bookings, slots crossing a window's end, midnight.
- Money: rounding to cents, the 18% + 3% split always adds up to the gross, and the balance never goes negative after a withdraw.
- Luhn check, expiry check (this month, past and future years), CVC; email, Hong Kong phone and password rules.
- Pure functions really are pure; no hidden reads of `Date.now()` without a way to inject the time in checks.

**Time and dates**
- The app treats times as Hong Kong time, but a viewer's device may be in Moscow or anywhere else. Check what happens when the browser time zone is **Asia/Hong_Kong**, **Europe/Moscow** and **America/Los_Angeles**:
  - seeded booking dates
  - "Open now"
  - "Today" and "Tomorrow"
  - the demo's blocked 10:00 slot
  - the charging timer
  - payout timing

  Decide on one rule: either always Hong Kong time, or always local time. State the rule in the report, and fix any place that breaks it.
- The day boundary: running the demo just before or after midnight.

**React and UI**
- Effects clean up their timers, intervals, listeners and Leaflet maps (no leaks after navigating back and forth 20 times).
- No state updates after unmount, and no stale closures in timers.
- Double-tap protection on every action button.
- Keys in lists; no `dangerouslySetInnerHTML` with user text (search for it).
- Route guards for both roles and for unknown ids.
- Focus handling in sheets and dialogs, and Escape to close.

**Security and privacy**
- Anything a user types (names, reviews, addresses, instructions, uploaded photos) is rendered as plain text, never as HTML.
- No secrets, tokens or personal data in the repo, in the build, or in Git history (scan the history).
- External links use `rel="noopener noreferrer"`.

**Build and deploy**
- The `vite.config` base path, the GitHub Actions workflow (pinned versions, permissions), and the web manifest paths under `/plug-and-park/`.

## Phase 3 — Dynamic testing (try to break it)
1. **Demo path, exactly as scripted.** Ten times in a row in the presenter view at 1280×720, then on 390×844 in Chromium, WebKit and Firefox. Every run starts from Reset.
2. **Time zones.** Run the smoke test with Playwright's `timezoneId` set to `Asia/Hong_Kong`, `Europe/Moscow` and `America/Los_Angeles`.
3. **Clock edges.** Use Playwright's fake clock (`page.clock`) to run the flow at 23:55, at 00:05, and with the spot about to close.
4. **Random exploration.** Write a short "monkey" script that taps random visible buttons and fills random inputs for about 3 minutes per role, with a fixed seed so it can be repeated. Log any console error, uncaught exception, blank screen or stuck spinner, together with the seed and the steps.
5. **Navigation abuse.** Browser Back and Forward through every flow; a hard refresh on every route; deep links with bad ids; opening the same booking in two tabs.
6. **Hostile input.** Very long names and addresses, emoji, Chinese characters, `<script>` text, leading and trailing spaces, pasted values with spaces or dashes in the card and phone fields.
7. **Storage stress.** Fill `localStorage` close to its limit (owner photos), block storage, and corrupt the stored data mid-session.
8. **Network.** Map tiles blocked, fonts blocked, fully offline after load, and slow 3G.
9. **Mobile specifics (WebKit).** Run at 375×667 and 430×932 and check: the keyboard covering inputs (scroll into view), `100dvh`, safe areas, and that inputs are at least 16px so iOS doesn't zoom.
10. **Long session.** Leave the app running for 15 minutes on the charging screen and the owner screen, and check memory and timers in Chromium's performance metrics.

## Phase 4 — Fix
- Fix P0 and P1 first, then safe P2s.
- Every fix gets a regression check in `scripts/checks/review.mjs` (add it to `npm run check`), named after its finding ID.
- Commit each fix separately: `REVIEW: <ID> <short description>`. Run `npm run typecheck`, `npm run build` and `npm run check` before every commit.
- Don't change anything else in the same commit.

## Phase 5 — Verify and report
1. Run all checks and smoke tests again (three browsers, three time zones). Push, confirm the deploy is green, and smoke-test the live URL.
2. Save screenshots of anything that changed visually to `Claude outputs1/screenshots/REVIEW/`. There should be very few, since this task doesn't change the design.
3. Tag the final commit `v1.2.1-review`.
4. Write `Claude outputs1/CODE_REVIEW_REPORT.md`:
   - **Summary:** how many findings at each severity, how many fixed, and whether the demo path is safe.
   - **Findings table:** ID · severity · area · file:line · what happens · how to reproduce · status (fixed with commit / not fixed with reason).
   - **The time-zone rule** you settled on, and why.
   - **Proposals** that would change the design or need a bigger refactor (not done).
   - **Checks:** before/after numbers for every test command, plus the new regression checks.
   - **Needs a human:** what only Roman can verify (real iPhone and Android, the classroom projector).
5. Update `PROGRESS.md` and stop.

## Done when
- [ ] No open P0 or P1.
- [ ] The scripted demo passes 10/10 in the presenter view, and passes in all three browsers and all three time zones.
- [ ] The monkey runs and the hostile-input runs end with no console errors and no stuck screens.
- [ ] Every fix has a regression check, and `npm run check` passes.
- [ ] Nothing about colours, layout, copy or the logo changed.
- [ ] The report is written, everything is pushed, and the live site passes its smoke test.
