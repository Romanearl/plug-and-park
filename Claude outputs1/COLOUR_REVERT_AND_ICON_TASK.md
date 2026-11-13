# COLOUR_REVERT_AND_ICON_TASK — Back to the black-and-blue design, new app icon

**Written by:** the reviewer, 13 Nov 2026 · **Approved by Roman:** 13 Nov 2026 · **Presentation:** Fri 20 Nov 2026

## When to start
- Start when Roman tells you to, for example "Start COLOUR_REVERT_AND_ICON_TASK.md".
- **If `CODE_REVIEW_TASK.md` is still in progress, finish it first.** That means the tag `v1.2.1-review`, `CODE_REVIEW_REPORT.md` and a green deploy. Only then start this task. The code review promised "no colour changes", so don't mix the two.
- This task **replaces `ON_HOLD_COLOUR_REVERT_TASK.md`**. Don't act on the old file. Everything you need is here.

## Goal
1. **Return the whole app to the colour design it had before RF-14.** This is the look of Roman's phone screenshot of the landing page:
   - pure black background
   - a muted bank-blue (`#7399C6`) pin with a black bolt, and muted blue glowing dots on a dark night-map illustration
   - white headline, grey sub-line, dark stat tiles
   - a white "Get started →" button and a ghost "I already have an account" button
   - the serif "Plug & Park" wordmark, white on a blue square, top left
   - the light-blue "Demo only — no real payments or emails · Demo" strip
2. **Use Roman's new logo as the app icon** everywhere an icon appears: favicon, iOS home screen, PWA/Android. The icon shows the full **"Plug / & Park"** wordmark, not "P&P".
3. Keep **every non-colour improvement** made since RF-14, including the code-review fixes.

## Part A — Colours (restore pre-RF-14)
**Reference:** the commit just before RF-14 (RF-14 commits start with `RF-14`; RF-14 itself is `ef21ee2`), or the tag `v1.1-demo`. Read old files with `git show v1.1-demo:<path>`. Compare with the pre-RF-14 screenshots in `Claude outputs1/screenshots/S1`–`S9` and the "before" shots in `screenshots/RF14/`.

1. **Tokens in `src/styles/app.css`:**
   - `--ink: #000000`, `--ink-2: #1f1f1f`, `--ink-3: #333333`
   - `--muted: #6b6b6b`, `--muted-2: #8f8f8f`
   - `--line: #e8e8e8`, `--surface: #f3f3f3`, `--surface-2: #eeeeee`, `--bg: #ffffff`
   - `--blue: #7399c6`, `--blue-deep: #3e5f8a`, `--blue-tint: #eaf0f8`, `--blue-ink: #1c2f4a`
   - `--success: #0e8345`, `--success-tint: #e6f4ec`
   - `--danger` and `--warning` stay as they are.

   Remove the `--mint*` tokens, and give every element that uses them the colour it had before RF-14.
2. **Everything RF-14 recoloured goes back to how it was:**
   - landing (black, blue pin and dots in the illustration)
   - map pins: black price pills, selected pin blue
   - RF-12 group pins: recolour them to match the black price pills, and keep their behaviour
   - chips, slots and tabs: selected is black with white text, as before
   - charging ring: blue
   - badges: the green success family
   - the owner's balance card and amounts
   - success checks
   - the weekly chart
   - the QR slide in the demo kit
   - `theme-color` meta tags and the manifest's `theme_color` and `background_color`: `#000000`
3. **Map:** the default style is the **light** greyed map used before RF-14. Keep the demo-sheet "Map style" switch, but make **Light** the default.
4. **In-app wordmark:** keep it as it was before RF-14 (serif "Plug &" / "Park", white on the blue square), exactly as in the screenshot. Don't redesign it. Only the app icon changes (Part B).

## Part B — New app icon
The ready-made files are in **`Claude outputs1/app-icon/`**. The design is Inter ExtraBold "Plug" / "& Park" in white, with a thin serif "&", stretched ×1.3 vertically, on a `#7399C6` square. The text is already outlined, so no font is needed.

| File | Use |
|---|---|
| `favicon.svg` | `<link rel="icon" type="image/svg+xml">` |
| `favicon-32.png`, `favicon-16.png` | PNG favicon fallbacks |
| `apple-touch-icon.png` (180×180) | `<link rel="apple-touch-icon">`, the iOS home screen |
| `icon-192.png`, `icon-512.png` | manifest icons, `"purpose": "any"` |
| `icon-maskable-192.png`, `icon-maskable-512.png` | manifest icons, `"purpose": "maskable"` (the text sits inside the safe zone) |
| `icon-512.svg`, `icon-maskable-512.svg` | sources, if a size is missing |
| `appicon-preview.png` | how it looks under iOS and Android masks (reference only, don't ship) |

1. Find where the current icons live (`public/`, `index.html`, `manifest.webmanifest`, and any script that generated them in RF-14). Replace them with these files and keep the paths under `/plug-and-park/` working.
2. If a script regenerates icons (for example during the build or in `demo-kit`), change it so it **copies these files** instead of drawing its own. Otherwise the old icon comes back.
3. Don't edit the icon files. If a size is missing, render it from the SVG sources and say so in the report.
4. Bump the icon file names or add a `?v=` query so phones and browsers don't keep the cached old icon.

## What must NOT change
- Anything that isn't a colour or the app icon: layout, copy, flows, data, behaviour, fonts.
- The RF-11 demo-script wording, the RF-12 grouped pins and every `CR-*` fix from the code review.
- `README.md`: Roman said no changes to sources or credits without his approval. Don't touch it unless a screenshot link there would break, and in that case ask first.

## Checks
- Point the RF-14 colour assertions (for example `scripts/checks/contrast.mjs`) at the restored tokens. Keep the contrast rules: white text on `--blue` must stay readable at large sizes, and body text must reach 4.5:1. If a pre-RF-14 pairing fails, list it as **KNOWN** in the report instead of changing the colour.
- Don't delete or weaken any other check.
- **Add `scripts/checks/icon.mjs`** to `npm run check`. It must confirm that:
  - every icon referenced in `index.html` and in the manifest exists in the build
  - the PNGs have the sizes their names claim
  - the shipped files are byte-identical to the ones in `Claude outputs1/app-icon/` (or rendered from them)
  - no "P&P" icon is left anywhere in `public/` or `dist/`

## How
- Git rules from `CLAUDE.md` apply. Commit and push are allowed. Destructive commands (`reset`, `restore`, `stash`, `rebase`, `push --force`) are not. Fetch and merge before pushing.
- Edit files rather than revert, because RF-14 commits also contain non-colour work.
- Commit in small steps: `COLOUR-REVERT: <what>` and `ICON: <what>`.
- Never `git add -A` on `Claude outputs1/`: it holds files that aren't ours.

## Finish
1. Run `npm run typecheck`, `npm run build`, `npm run check` and `npm run smoke` (Chromium, WebKit, Firefox).
2. Save after shots of the same 15 screens as RF-14 to `Claude outputs1/screenshots/COLOUR-REVERT/`. Also save:
   - the browser tab with the new favicon
   - the manifest icons, rendered at 192 px
3. Regenerate the demo kit. Push, confirm the deploy is green, and smoke-test the live URL.
4. Tag `v1.3-demo`.
5. Update `CLAUDE.md` §6 to the text in the appendix below.
6. Write `Claude outputs1/COLOUR-REVERT_REPORT.md` using the usual report template:
   - before/after screenshot pairs
   - any colour that doesn't exactly match the screenshot, and why
   - "Needs Roman": check the icon on his real iPhone. He needs to delete the old home-screen shortcut and add it again, because iOS caches icons.
7. Update `PROGRESS.md` and stop.

## Done when
- [ ] Every screen matches the pre-RF-14 colours, and the landing page matches Roman's screenshot.
- [ ] The favicon, iOS home-screen icon and PWA icons all show the new "Plug & Park" logo, and no "P&P" icon remains.
- [ ] `npm run check` (with the new `icon.mjs`) and `npm run smoke` pass in all three browsers.
- [ ] Pushed, deploy green, live smoke test passed, tagged `v1.3-demo`, report written.

---

## Appendix — new text for `CLAUDE.md` §6 "Visual direction" and the tokens
Replace the "Visual direction" bullets and the token block with this.

**Uber's layout language in black and white, with one accent: a muted bank blue.** (Colour system restored to the pre-RF-14 design on Roman's request; see COLOUR_REVERT_AND_ICON_TASK.md.)
- Black and white base, lots of white space, bold tight sans-serif headings.
- A full-bleed light greyed map with white bottom sheets sliding over it. The dark map stays available in the demo sheet.
- Pill buttons 52px tall and full-width. Primary actions are black with white text.
- Blue `#7399C6` is the single accent: the wordmark box, the pin illustration, the charging ring, links and focus.
- Selected chips, slots and tabs are black with white text. Success uses the green family.
- Wordmark (in the app): serif "Plug &" / "Park", white on a blue square. **App icon:** the files in `Claude outputs1/app-icon/`. Never draw your own icon.
- Landing uses a black background.

```css
--ink: #000000; --ink-2: #1f1f1f; --ink-3: #333333;
--muted: #6b6b6b; --muted-2: #8f8f8f;
--line: #e8e8e8; --surface: #f3f3f3; --surface-2: #eeeeee; --bg: #ffffff;
--blue: #7399c6; --blue-deep: #3e5f8a; --blue-tint: #eaf0f8; --blue-ink: #1c2f4a;
--success: #0e8345; --success-tint: #e6f4ec;
/* --danger, --warning, radii, shadows, fonts: unchanged */
```
