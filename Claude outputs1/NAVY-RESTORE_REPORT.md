# NAVY-RESTORE report — Back to navy, sky blue and mint, with the navy app icon          Date: Mon 16 Nov 2026

## Done
- **Colours restored (Part A)**: `src/` is now **byte-identical to `v1.2.1-review`** (`git diff v1.2.1-review HEAD -- src` is empty). That brings back the RF-14 tokens (`--ink #102A43`, `--blue #68A8E8`, `--blue-deep #2B66A8`, mint family, success in mint), the navy landing with the mint pin and dots, the RF-14 mint/navy pins and RF-12 group pins, sky-blue selected chips, slots and tab, the mint charging ring and badges, the navy balance card, and the weekly chart. It also keeps every `CR-*` fix, because those were already in `v1.2.1-review` (d5bc295).
- **Map**: dark is the default again, and "Map style: Dark / Light" is still in the demo sheet. The white pin outline from `v1.3-demo` is gone (d5bc295).
- **"More blue" (7eef699)** removed (d5bc295).
- **App icon (Part B)**: `make-icons.mjs` and `icon.mjs` now point at `Claude outputs1/app-icon-navy/`. The favicon (SVG, 16, 32), apple-touch-icon and PWA 192/512 icons, plain and maskable, are copied byte-for-byte. The cache buster is `?v=3`, `theme-color` is `#102A43` and the manifest colours are navy. `app-icon-navy/` is committed; `app-icon/` stays as an archive and nothing from it ships (256e22c).
- **Checks**: `contrast.mjs` is back to its `v1.2.1-review` version. I added three guards to it: group-pin colours, no white pin outline, and a failure if any black-and-blue token (`#7399c6`, `--ink: #000000`, …) is left in `src/`, `public/` or `index.html`. The Dark/Light cross-window sync check is kept, adjusted so Dark is the default. `icon.mjs` requires every icon to be byte-identical to `app-icon-navy/` and fails on any blue-square or "P&P" icon in `public/` or `dist/` (01f2889).
- **Screenshots**: every session re-shot, plus 15 after/before pairs, the favicon tab and the manifest icons in `screenshots/NAVY-RESTORE/` (3da09b4).
- **Demo kit** regenerated: navy QR slide, mint ring, all 25+25 screens, 3 flows and both videos. `DEMO_SCRIPT.md` is identical to `v1.2.1-review` again ("mint-green ring"; "The dark map is hard to see on the projector → Map style → Light") (26eac76).
- Root `CLAUDE.md` synced from the master (fb78d23).

## Not done / partial
- None.

## Deviations from the task
- None. Because `src/` matches `v1.2.1-review` exactly, I reverse-applied the colour commits by restoring the tagged source files, not by using `git revert`. No non-colour `src/` work was made after the tag, so nothing was lost.

## Checks
- typecheck: pass · build: pass · check: 12/12 files pass · smoke: Chromium, WebKit and Firefox pass locally; Chromium passes on the live URL.
- Screenshot self-review: done. The landing matches Roman's navy screenshot (mint pin with a navy bolt, mint dots, white "Get started →", ghost button, serif wordmark navy on sky blue, light-blue demo strip). The manifest icons show the navy logo with the mint "&".

## Screenshots (in Claude outputs1/screenshots/NAVY-RESTORE/)
| File | Shows |
|---|---|
| 01–15 `*-after.png` / `*-before-v1.2.1.png` | Landing, map (all pins, selected, light style), spot details, slot chosen, approved, payment, QR + PIN, charging, owner requests, earnings and breakdown, scheduler, presenter 1280×720 |
| 16-favicon-tab.png | Browser tab with the navy favicon |
| 17-manifest-icons.png | PWA 192/512 (any and maskable) and apple-touch-icon |

## Screens that don't match v1.2.1-review
- None in the app: the source is identical. Only the icon files and the icon tags differ, which is intended (Part B).

## "More blue" proposals (states that 7eef699 coloured but that have no accent at v1.2.1-review)
These were not added. At `v1.2.1-review` they are **navy**:
- On/off switches (scheduler), the checkbox (terms), the price slider (`accent-color`) and the **current** step dot in the booking stepper.
- Proposal for the reviewer: keep them navy. They are controls, not selections, so they don't fall under "sky blue = selected". If Roman wants more accent colour, the switch track is the most visible candidate (`--blue` fill, navy thumb).

## Known bugs / risks
- KNOWN contrast, same as at `v1.2.1-review`: `--danger` on `--danger-tint` is 4.19:1.

## Decisions made
- Restored the tagged `src/` files in full instead of reverse-applying hunks one by one. The result is the same, and it's easier to verify.

## Needs a human (Roman or the reviewer)
- Roman: delete and re-add the home-screen shortcut on your iPhone, because iOS caches the old icon.
- Roman: check the dark map on the classroom projector. The fallback is Demo strip → Map style → Light.

## Commits & deploy
- Commits: fb78d23, d5bc295, 256e22c, 01f2889, 3da09b4, 26eac76, plus this report.
- Pushed: yes · Actions run: green (26eac76) · Live URL checked: yes. The live favicon is byte-identical to `app-icon-navy/favicon.svg`, `theme-color` is `#102A43`, and the live smoke test passes.
- Tag: **v1.4-demo**
