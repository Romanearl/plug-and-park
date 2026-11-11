# S8_TASK — Visual polish

Read `CLAUDE.md` first and follow the autonomous run protocol.

No new features in this session. The goal is that every screen looks like one finished, deliberate app when it's projected in front of a class. Work from screenshots: re-shoot everything (`npm run shots -- all`), look at every image, and fix what you see.

## 1. Consistency pass (all screens)
Check each screen against CLAUDE.md §6 and fix deviations:
- **Spacing:** 20px side gutters everywhere; vertical rhythm on a 4/8px grid; the same gap between a title and its content on every screen.
- **Headers:** one pattern for full-screen flows (round back button at the top left, `.h1` title under it) and one for tab screens (`.h1` title, optional sub-line). No screen invents its own.
- **Type:** only the classes in the type scale. No stray font sizes or weights. Numbers that change (prices, timers, kWh) use `font-variant-numeric: tabular-nums`.
- **Buttons:** one primary action per screen, black, at the bottom. Secondary actions are grey or ghost. Destructive ones are red-tinted. Labels are verbs in sentence case.
- **Colour:** `--blue` only as an accent (selected, active, progress, highlights). No white text on `--blue`. Status colours only for status.
- **Cards and sheets:** the same radius, border and padding everywhere.
- **Icons:** the same stroke width and optical size; every icon-only button has an `aria-label`.
- **Bottom safe area:** nothing sits under the home indicator or the tab bar; the last item of every scroll area can be scrolled fully into view.

## 2. Motion (short and subtle; all of it respects `prefers-reduced-motion`)
- Screen changes: forward navigation slides the new screen in from the right (about 240ms), back slides it out; tab switches cross-fade. Keep it simple and robust — if a transition causes any flicker or a blank frame, use a plain fade.
- Sheets follow the finger while dragging and settle with the `--ease` curve.
- Lists: skeleton placeholders for the simulated waits instead of bare spinners, where it fits.
- Small feedback: button press scale, the success check pop, the star tap bounce, the charging ring easing, number count-up on the earnings balance.

## 3. Photos
- Add `public/photos/` and a manifest `public/photos/manifest.json` mapping spot ids to file names. `SpotPhoto` shows a real photo when the manifest has one for that spot and index, and the generated illustration otherwise. A missing or broken file falls back silently.
- **Don't download or hot-link any image.** Roman and his teammates will add real photos (their own or free-licence ones) to that folder later. Write `public/photos/README.md` explaining: file naming (`<spotId>-1.jpg` …), recommended size (1200×800, under 250 KB), how to add an entry to the manifest, and that every photo needs a credit line in the main README.
- Improve the generated illustrations so the app looks finished even if no real photo ever arrives: more distinct scenes per property type, depth (floor, wall, light), a clear charger and cable, and a consistent palette.

## 4. Looks like an installed app
- A web app manifest (`name`, `short_name`, `display: standalone`, `theme_color` black, `background_color` black, `start_url` and `scope` under `/plug-and-park/`), icons at 192 and 512 (generated from the wordmark: white serif "P&P" or a bolt on `--blue`), an `apple-touch-icon`, and the iOS meta tags, so "Add to Home Screen" opens it full-screen without browser bars.
- No service worker and no offline caching (stale caches are a demo risk).

## 5. Accessibility basics
- Every input has a visible label; errors are tied to their field with `aria-describedby`; sheets trap focus and close on Escape; toasts use `role="status"`.
- Body text and controls meet 4.5:1 contrast (3:1 for large text). Check the grey text on `--surface` backgrounds in particular.
- Tap targets are at least 44×44px, with at least 8px between neighbours.

## 6. Performance sanity
- The map chunk is lazy-loaded; the landing page doesn't load Leaflet.
- No layout shift when fonts load (set `font-display: swap` via the Google Fonts URL and keep fallback metrics close).
- The built JS is reported in the session report (sizes per chunk). No action needed unless the main chunk is over about 350 KB gzipped.

## 7. Things only a human can check — list them, don't guess
Write a section "Needs a human" in the report with exact steps for Roman:
- open the live URL on a real iPhone (Safari) and a real Android phone (Chrome): the address bar and safe areas, the keyboard covering inputs on the auth and payment forms, sheet dragging, map pinch-zoom, and the OTP paste suggestion
- "Add to Home Screen" and launch from the icon
- the projector: presenter view at the classroom's resolution

## Shots
Re-shoot **every** scenario into `Claude outputs1/screenshots/S8/` (the full set, same file names as the earlier sessions prefixed with the session, e.g. `S3-04-map-pin-selected.png`), so the reviewer can compare before and after.

## Done when
- [ ] Every screenshot has been opened and inspected, and the report lists what changed per screen.
- [ ] No screen breaks the rules in section 1 (state any deliberate exception).
- [ ] Transitions never show a blank frame or a flicker (check by recording a short Playwright video of the main flow and stepping through it).
- [ ] The app works with an empty `public/photos/` and with one test photo added through the manifest (use a generated placeholder JPEG for the check, then remove it).
- [ ] The manifest and icons are valid and referenced with the `/plug-and-park/` base.
- [ ] `npm run check` passes for S1–S8 — polish must not break behaviour.
