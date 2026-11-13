# COLOUR-REVERT report — black-and-blue design + new app icon          Date: Fri 13 Nov 2026

Task: `COLOUR_REVERT_AND_ICON_TASK.md` (started after `CODE_REVIEW_TASK.md` was finished and tagged `v1.2.1-review`) · tag **`v1.3-demo`**

## Done
- **Pre-RF-14 colours restored** by reverse-applying only the colour parts of RF-14 (`ef21ee2`), not by reverting the commit. The diff applied cleanly on top of the code-review fixes. Files: `src/styles/app.css` (tokens exactly as in the task, `--mint*` removed), `Landing.tsx` (black, blue pin and dots), `SpotPhoto.tsx`, `Session.tsx` (blue ring), `Earnings.tsx` (blue "today" bar, grey others, no mint), `Requests.tsx`, `Wordmark.tsx`, `index.html` and `manifest.webmanifest` (`#000000`), `scripts/demo-kit.mjs` (black QR slide, white-on-blue wordmark).
- **Map:** the light greyed map is the default again. The demo sheet keeps **Map style**, now ordered **Light** / **Dark**. Dark inverts the same tiles; there the pins get a thin white outline so the black pills stay visible (`app.css`, `mapStyle.ts`, `DemoBanner.tsx`).
- **RF-12 group pins** are the same black pill as the price pins; their behaviour is unchanged.
- **New app icon** (Roman's "Plug / & Park" logo) for the favicon (SVG + 32/16 PNG), the iOS home screen (180) and PWA/Android (192/512 "any" and separate 192/512 "maskable"). All are copied byte-for-byte from `Claude outputs1/app-icon/`. Every link carries `?v=2` so browsers and phones drop the cached old icon.
- `scripts/make-icons.mjs` now **only copies** those files and never draws an icon, so the old bolt can't come back.
- **New check `scripts/checks/icon.mjs`** (43 checks), added to `npm run check`: every icon in `index.html` and the manifest is served, PNG sizes match, files are byte-identical to `app-icon/`, nothing else (old bolt or "P&P") is in `public/` or `dist/`, the preview file isn't shipped, and `make-icons.mjs` doesn't draw.
- **`scripts/checks/contrast.mjs`** rewritten for the restored palette (56 checks). It checks every token, that no navy/sky/mint colour is left in `src/`, `public/` or `index.html`, black pins and chips, the blue selected pin and ring, the black balance card, the chart colours, the light default map, and the Dark switch syncing across windows.
- `CLAUDE.md` §6 replaced with the appendix text, plus four small follow-ups that still said navy or mint (button and chip descriptions, the status-bar line, the report template's "navy hero").
- `DEMO_SCRIPT.md`: two colour words only. "mint-green ring" became "blue ring". The "If something goes wrong" row now reads "The light map is washed out on the projector → Map style → Dark".
- Screenshots re-shot for every session (107, no errors). The demo kit is regenerated: both videos, 25 + 25 screens, 3 flows, and the QR slide.

## Not done / partial
- None.

## Deviations from the task
- **I edited the master `Claude outputs1/CLAUDE.md` as well as the root copy.** CLAUDE.md says never to edit the master, but this task says "Update CLAUDE.md §6", and editing only the root copy would be undone by the next run's master→root sync. Reviewer: please check §6 and the four follow-ups and keep or change them as you see fit.
- **I committed `Claude outputs1/app-icon/`** (Roman's source files, about 220 kB). `make-icons.mjs` copies from it and `icon.mjs` compares against it, so a fresh clone needs it. I left the logo PDFs, the pptx and `ON_HOLD_COLOUR_REVERT_TASK.md` untracked.
- **The map container behind the tiles is Leaflet's own `#ddd`** while tiles load, as before RF-14 (the full-colour override was an RF-14 addition). Not visible once tiles are in.
- Screenshot scenario `S3/14-map-light-style` became `S3/14-map-dark-style`, since Light is now the default and the optional style is Dark.

## Checks
- typecheck: pass · build: pass, no warnings · check: **12/12 files** (s1–s9, contrast 56/56, icon 43/43, review 30/30) · smoke: **Chromium, WebKit, Firefox pass** · shots: 107, errors: none
- **KNOWN contrast** (pre-RF-14 pairings, kept as the task says; each is checked so it can't get worse):
  - white on `--blue` is 2.96:1, used only by the wordmark. It is under 3:1 even for large text, but it is the look in Roman's screenshot.
  - `--success` on `--success-tint` is 4.26:1 (green badges, bold 12 px).
  - `--danger` on `--danger-tint` is 4.19:1 (unchanged since before).
- Screenshot self-review: done. I compared the landing, map, charging and earnings screens side by side with the `v1.1-demo` shots; they match, apart from the RF-12 group pins, which stay by design. Nothing needed fixing.

## Screenshots (in `Claude outputs1/screenshots/COLOUR-REVERT/`)
| File | Shows |
|---|---|
| `01`–`15-…-after.png` | the same 15 screens as RF-14, in the restored colours |
| `01`–`15-…-before-navy.png` | the RF-14 navy versions of the same screens (for `04`, the dark map style, the navy all-pins shot) |
| `16-favicon-tab.png` | the SVG and PNG favicons, as the app serves them, in a tab strip |
| `17-manifest-icons.png` | the four manifest icons and the iOS icon at 192 px (maskable and iOS shown with rounded corners) |

Every session folder `S1`–`S9` is also re-shot.

## Colours that don't exactly match Roman's screenshot
- None that I could see. The landing page uses the exact pre-RF-14 SVG and CSS (`git show v1.1-demo:…`), so pixel colours match the `v1.1-demo` landing shot. If his phone screenshot looks slightly different, that comes from the phone's display or compression, not the code.

## Known bugs / risks
- iOS and Android cache home-screen icons hard. The `?v=2` only helps for new installs and browser tabs.

## Decisions made
- Dark map pins get a 1.5 px white ring, because black pills on an inverted dark map were hard to see. Light (the default) is unchanged.
- The two other surfaces that showed the old bolt icon (README image, `docs/`) pick up the new icon through the same file path. README.md itself is not edited.

## Needs a human (Roman or the reviewer)
- **Roman: check the icon on your real iPhone.** Delete the old "Plug & Park" home-screen shortcut first, then Safari → Share → **Add to Home Screen** again. iOS caches icons, so the old one stays until you do.
- **Roman:** the `README.md` header image (`public/icons/icon-192.png`) now shows the new logo. The README text is untouched.
- **Reviewer:** the `CLAUDE.md` master edit (see Deviations).
- The projector check now applies to the light map (fallback: Demo strip → Map style → Dark).

## Commits & deploy
- `2fa40e9` task file · `4667523` colours · `89f5b59` icons · `150ed3b` icon check · `87a1bf5` colour checks · `aaf3f52` icon sources · `ec41abb` screenshots · `dc5785c` demo kit · plus this report, `CLAUDE.md` §6 and `PROGRESS.md`
- Pushed: yes · Actions run: green · Live URL checked: yes (live smoke, live icon check) · tag `v1.3-demo`
