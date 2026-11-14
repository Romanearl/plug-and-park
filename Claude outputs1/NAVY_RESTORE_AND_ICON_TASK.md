# NAVY_RESTORE_AND_ICON_TASK — Back to navy, sky blue and mint, with the navy app icon

**Written by:** the reviewer, 14 Nov 2026 · **Approved by Roman:** 14 Nov 2026 · **Presentation:** Fri 20 Nov 2026

## When to start
- Start when Roman tells you to, for example "Start NAVY_RESTORE_AND_ICON_TASK.md".
- This task **undoes the result of `COLOUR_REVERT_AND_ICON_TASK.md` (tag `v1.3-demo`)** and of the "More blue" change (`7eef699`). Don't run either of those again.

## Goal
1. **Return the whole app to the navy / sky blue / mint design** it had at the tag **`v1.2.1-review`**: RF-14's colours plus every code-review fix. This is the look of Roman's phone screenshot of the landing page:
   - navy background
   - a mint pin with a navy bolt, and mint glowing dots on the navy night-map illustration
   - white headline, grey-blue sub-line, navy stat tiles with a light outline
   - a white "Get started →" button with navy text, and a ghost "I already have an account" button
   - the serif "Plug & Park" wordmark, navy on a sky-blue square, top left
   - the light-blue "Demo only" strip
2. **Use Roman's new navy logo as the app icon** everywhere an icon appears: favicon, iOS home screen, PWA/Android. The logo is white "Plug" / "Park" with a **mint "&"** on a **navy** square.
3. Keep **every non-colour improvement** made since `v1.2.1-review`. That includes the icon pipeline (`make-icons.mjs` only copies, `icon.mjs`, the cache-busting query) and every `CR-*` fix.

## Part A — Colours (restore `v1.2.1-review`)
**Reference:** the tag `v1.2.1-review`. Read old files with `git show v1.2.1-review:<path>`. The target screenshots are the `…-before-navy.png` files in `screenshots/COLOUR-REVERT/` and the "after" shots in `screenshots/RF14/`.

1. **Undo the colour parts of commits made after `v1.2.1-review`:**
   - `4667523` colours
   - `87a1bf5` colour checks
   - `7eef699` "More blue"
   - the colour and wording parts of `dc5785c` (demo kit) and of the `DEMO_SCRIPT.md` edit

   Do this the same way the revert was done: **reverse-apply only the colour changes**. Don't `git revert` whole commits if they also contain non-colour work.
2. **Tokens in `src/styles/app.css`:** exactly as at `v1.2.1-review`. That means:
   - `--ink: #102A43` and the rest of the navy family
   - `--blue: #68A8E8` and `--blue-deep: #2B66A8`
   - `--mint: #4EE4B6`, `--mint-deep` and `--mint-tint`
   - success in the mint family
3. **Everything goes back to how it looked at `v1.2.1-review`:**
   - landing (navy, mint pin and dots)
   - map pins: the RF-14 mint/navy pins, with the RF-12 group pins in the same style
   - chips, slots and tabs: selected is sky blue with navy text
   - charging ring: mint
   - badges: the mint family
   - the navy balance card and amounts
   - success checks
   - the weekly chart
   - the QR slide in the demo kit
   - `theme-color` meta tags and the manifest's `theme_color` and `background_color`
4. **Map:** the **dark** map is the default again, and "Map style: Dark / Light" stays in the demo sheet, as at `v1.2.1-review`. Remove the white outline on dark-map pins that `v1.3-demo` added: the RF-14 pins don't need it.
5. **In-app wordmark:** the serif wordmark, navy on sky blue, exactly as in the screenshot. Don't redesign it. Only the app icon changes (Part B).
6. **"More blue":** don't keep it. The RF-14 rule ("sky blue = selected or tappable") already covers selected states. If a selected state from `7eef699` has no colour at `v1.2.1-review`, list it in the report as a proposal instead of adding it.

## Part B — New app icon
The ready-made files are in **`Claude outputs1/app-icon-navy/`**. They use the same file names and sizes as `app-icon/`:
- `favicon.svg`, `favicon-32.png`, `favicon-16.png`
- `apple-touch-icon.png`
- `icon-192.png`, `icon-512.png`
- `icon-maskable-192.png`, `icon-maskable-512.png`
- the SVG sources
- `appicon-preview.png` (reference only, don't ship)

The maskable icons fill the Android safe zone exactly. Don't scale them.

1. Point `scripts/make-icons.mjs` and `scripts/checks/icon.mjs` at **`Claude outputs1/app-icon-navy/`** instead of `app-icon/`.
2. Commit `app-icon-navy/`, because a fresh clone needs it. Leave `app-icon/` in the repo as an archive, but make sure nothing from it ships. `icon.mjs` must fail if any blue-square icon or "P&P" icon appears in `public/` or `dist/`.
3. Bump the cache buster to `?v=3` everywhere.
4. Don't edit the icon files.

## What must NOT change
- Anything that isn't a colour or the app icon: layout, copy, flows, data, behaviour, fonts.
- The RF-11 demo-script wording, the RF-12 grouped pins and every `CR-*` fix.
- `README.md`, unless a link would break; in that case, ask Roman first. The README header image picks up the new icon through the same path.
- **Don't edit the master `Claude outputs1/CLAUDE.md`.** The reviewer has already updated §6 to the navy design and the `app-icon-navy/` source. Just sync the root copy from it as usual.

## Checks
- Restore `scripts/checks/contrast.mjs` to its `v1.2.1-review` version: `git show v1.2.1-review:scripts/checks/contrast.mjs`. Keep any later assertion that isn't about the black-and-blue palette, such as the Dark/Light switch syncing across windows, adjusted for Dark being the default. It must again fail if a black-and-blue token, such as `#7399c6` or `--ink: #000000`, is left in `src/`, `public/` or `index.html`.
- KNOWN contrast: only what was KNOWN at `v1.2.1-review` (`--danger` on `--danger-tint`, 4.19:1).
- `icon.mjs`: byte-identical to `app-icon-navy/`, and the other rules as above.
- Don't delete or weaken any other check.

## How
- Git rules from `CLAUDE.md` apply. Commit and push are allowed. Destructive commands (`reset`, `restore`, `stash`, `rebase`, `push --force`) are not. Fetch and merge before pushing.
- Commit in small steps: `NAVY-RESTORE: <what>` and `ICON: <what>`.
- Never `git add -A` on `Claude outputs1/`.

## Finish
1. Run `npm run typecheck`, `npm run build`, `npm run check` and `npm run smoke` (Chromium, WebKit, Firefox).
2. Save after shots of the same 15 screens to `Claude outputs1/screenshots/NAVY-RESTORE/`. Put each one next to its `v1.2.1-review` counterpart, which comes from the `…-before-navy.png` files. Also save the favicon tab and the manifest icons at 192 px. Re-shoot every session.
3. Regenerate the demo kit, including `DEMO_SCRIPT.md` colour words back to `v1.2.1-review`: "mint ring", and the "dark map washed out → Map style → Light" fallback.
4. Push, confirm the deploy is green, and smoke-test the live URL.
5. Tag **`v1.4-demo`**.
6. Write `Claude outputs1/NAVY-RESTORE_REPORT.md` using the usual report template. List:
   - any screen that doesn't match `v1.2.1-review`
   - the "More blue" proposals, if any
   - "Needs Roman": re-add the home-screen shortcut on his iPhone; the projector check of the dark map
7. Update `PROGRESS.md` and stop.

## Done when
- [ ] Every screen matches `v1.2.1-review`'s colours, and the landing page matches Roman's navy screenshot.
- [ ] The favicon, iOS and PWA/Android icons show the navy logo with the mint "&". No blue-square or "P&P" icon ships.
- [ ] `npm run check` and `npm run smoke` pass in all three browsers.
- [ ] Pushed, deploy green, live smoke test passed, tagged `v1.4-demo`, report written.
