# RF-11 to RF-15 report — script wording, group pins, new colour system          Date: Thu 12 Nov 2026

## Done
- **RF-11 script wording** — 3:55 row says "Owners set the weekly hours when their bay is free, and block out the times they need it themselves." (also in the short version); flow cell is "Proposal: availability scheduler". `README.md` and `SCREENS.md` link only to demo-kit images, all regenerated (`demo-kit/DEMO_SCRIPT.md`).
- **RF-12 group pins** — pins that would overlap merge into one group pin showing the count and the lowest price; tapping it zooms to its members (cap 15) where they are separate price pins; a selected spot keeps its own pin; the sheet still says "12 chargers nearby" (`src/lib/pins.ts`, `src/screens/driver/MapHome.tsx`).
- **RF-13** — superseded by RF-15, as instructed.
- **RF-14 colour system** — navy base, sky blue for selected or tappable, mint for live (`src/styles/app.css`: every colour is a token; no hex outside `:root`).
  - Sky blue: selected chips, slots, durations, role and payout cards, segment toggles, sheet handle, finished steps, onboarding progress; active tab, links and focus in `--blue-deep`.
  - Mint: pins (navy text, 1.5px navy border), status badges, charging ring and live dot, pending pulse, success circles with a navy check, balance amounts; `--mint-deep` for "You earn", net amounts and "You receive" on white; today's chart bar.
  - Dark map: same OpenStreetMap tiles, new `--map-filter` with a navy tint; navy container background and navy fade behind the search pill; mini map uses the same style.
  - "Map style: Dark / Light" in the demo sheet, saved in `localStorage`, synced across windows (`src/lib/mapStyle.ts`, `src/components/DemoBanner.tsx`).
  - Wordmark is navy on sky blue; favicon and app icons regenerated (`scripts/make-icons.mjs`); landing illustration and spot illustrations recoloured.
- **RF-15 re-verify** — checks, three-browser smoke, every session re-shot, demo kit regenerated (navy QR slide), script wording ("mint-green ring", new "dark map hard to see" row), live smoke, tag `v1.2-demo`.

## Not done / partial
- **`README.md` was not edited.** Roman committed to it on GitHub during this run ("no changes allowed to sources or credits without prior approval"). Its images are demo-kit files, so they show the new colours anyway; its text has no colour wording that became wrong.
- **`--danger` on `--danger-tint` is 4.19:1**, under the 4.5:1 the contrast check asks for. RF-14 also says not to change the danger colours, so the check prints it as KNOWN and only fails if it gets worse. Fix when allowed: a darker danger text (about `#C02A23`) on the tint.
- **"Battery figure accents in mint"** — the ring, live dot and Live pill are mint; the big percentage stays white for legibility.

## Deviations from the task
- **Group label is "2 · $23+", not "2 · from $23".** The wider label made group pins swallow their neighbours at the opening zoom: one pin ended up holding five far-apart chargers, and a tap could not split it, so "every spot within two taps" failed. With the short label the opening map has 6 pins (2 single, 4 groups) and the rule passes.
- **QR code stays pure black on white**, not navy. With themed colours the QR check could not decode it, and scanner reliability matters more than matching the palette.
- **Pin tail is navy** (it continues the border); the pill is mint.
- **Home indicator on light screens is black** (frame hardware), as RF-14 says.
- Older checks that counted `.pin` elements now count chargers (a group pin counts its members). No check was removed; s8's manifest check now expects the navy theme colour.

## Checks
- typecheck: pass · build: pass · check: 10/10 files pass (s2 62, s3 85, s4 59, s5 65, s6 43, s7 53, s8 24, s9 18, contrast 61; s1 pass)
- New checks: 12 in `s3.mjs` for RF-12 (no overlap at zoom 10–17, 12 spots within two taps, demo path unchanged) and `contrast.mjs` (25 token pairs, no hex outside tokens, no white on blue or mint and no blue or mint text on light across map, booking sheet, approved, payment, requests, earnings; Dark/Light switch and sync).
- smoke: Chromium, WebKit, Firefox pass locally · Chromium passes against the live URL (Fri 13 Nov 2026 00:56 HKT, commit b3dde82)
- shots: 107 per-session + 107 in `S8/`, no errors · demo kit: 2 videos (2 min 48 s, 1 min 16 s), 25 phone + 25 framed screens, 3 flow images, QR slide
- Screenshot self-review: done. Fixed: map looked grey rather than navy at the all-Hong-Kong zoom (stronger tint); Leaflet's own light-grey container background was showing behind tiles.

## Screenshots (in Claude outputs1/screenshots/RF14/, each as `-before.png` and `-after.png`)
| File | Shows |
|---|---|
| 01-landing | Navy landing, mint chargers, navy-on-blue wordmark |
| 02-map-all-pins | Dark map, 6 mint pins (4 groups), blue "All" chip and sheet handle |
| 03-map-selected-pin | White selected pin, preview sheet |
| 04-map-light-style | Light map style (before = the old map) |
| 05-spot-details · 06-booking-slot-chosen | Details; blue selected slot and duration |
| 07-booking-approved · 08-payment · 09-qr-pin | Mint success card and check; payment; QR + PIN |
| 10-charging-session | Navy screen, mint ring and Live pill |
| 11-owner-requests · 12/13-owner-earnings | "You earn" in deep mint; mint balance; breakdown |
| 14-scheduler · 15-presenter-1280x720 | Navy switches; two phones |

"Before" was taken after RF-12, so both sides show group pins.

## Known bugs / risks
- **Projector:** the dark map is untested on a real projector. The Light switch is the fallback.
- In the presenter view the scaled driver phone can show a faint vertical seam between map tiles. It was there before; it is a little more visible on the dark map.
- A spot added next to an existing cluster (e.g. a new Sai Kung owner) can need three taps from the all-Hong-Kong view. All 12 seeded spots need two at most.
- Roman now commits on GitHub too, so a push can be rejected; this run merged his two README commits (no conflicts).

## Decisions made
- Short group label over the example wording — the two-tap rule and "no overlaps" were the harder requirements.
- Pending "waiting for owner" pulse is mint (status), not blue.
- The map style choice survives "Reset demo", so a projector setting isn't lost mid-talk.
- Added tokens for things that were hard-coded: `--line-strong`, `--on-ink`, `--on-ink-muted`, `--glass*`, `--scrim`, `--frame*`, `--stage-*`, `--map-*`.

## Needs a human (Roman or the reviewer)
- **Roman: check the dark map on the classroom projector.** If it washes out: Demo strip → Map style → Light.
- Reviewer: accept or change the "2 · $23+" label, and decide on the danger text colour.
- Roman: three logo PDFs and a `.pptx` appeared in `Claude outputs1/`; they were left alone and not committed. When the logo is final, it goes in `src/components/Wordmark.tsx`, `public/favicon.svg` and `scripts/make-icons.mjs`.
- Roman: say if `README.md` should mention the new look; it was left as you committed it.
- Unchanged from before: real phones, team names, photos, MP4.

## Commits & deploy
- Commits: 62182e0 RF-11 · 962ea2b RF-12 · ef21ee2 RF-14 · 698a711 merge of Roman's README commits · b3dde82 RF-15 assets · plus the final PROGRESS/report commit
- Tags: `v1.0-freeze`, `v1.1-demo` unchanged · `v1.2-demo` on the final commit (hash in `PROGRESS.md`)
- Pushed: yes · Actions run: green · Live URL checked: yes (smoke test)
