# S1 + S2 report — Foundation + Auth          Date: Wed 11 Nov 2026

## Done
**S1: Foundation**
- Workspace: `git init -b main`. Root `CLAUDE.md` copied from the master. Vite + React 19 + TS strict scaffolded by hand (no demo content).
- Config: `vite.config.ts` (`base: '/plug-and-park/'`), `tsconfig.json` (strict, noUnused*, react-jsx), `.gitignore`, `.gitattributes`, `index.html` (fonts, meta, favicon `public/favicon.svg`).
- Design system: `src/styles/app.css` has the tokens exactly as in §6, plus base, type scale, every listed component class, keyframes (`fade-in`, `slide-up`, `rise`, `pulse-ring`), reduced-motion handling and the phone-frame classes.
- Data: `src/data/types.ts`, `src/data/seed.ts`, `src/lib/util.ts`, `src/lib/store.ts` (from appendices A1–A4).
- Router: **custom hash router** `src/lib/router.tsx` (`usePath`, `useQuery`, `navigate`, `back`, `matchPath`, `Router`, `Link`; it scrolls `.scroll` to the top on route change).
- `src/components/PhoneFrame.tsx`: full screen under 520px; at 520px+ a framed 390×844 phone scaled to fit, with a live clock, dynamic island, SVG signal/wifi/battery, `useStatusBar()`, home indicator, and the caption at ≥1000px.
- Components: `Icon` (22 icons), `Wordmark` (sm/md/lg), `DemoBanner` + Demo sheet (credentials, sign in as driver/owner, two-tap reset), `BottomSheet`.
- Screens: `Landing.tsx` (night-map SVG, headline, stats, CTAs) and `ComingSoon.tsx` (placeholder for `/app`, `/owner` and the 404).
- `.github/workflows/deploy.yml`, `README.md`, `scripts/screenshots.mjs`.

**S2: Auth**
- `src/lib/validation.ts`: pure validators for every rule in the table, plus phone format/mask and the password-rule list.
- `src/lib/auth.ts`: pending login/registration (per window, in sessionStorage), `checkLogin`, `completeVerification` (creates the user only after the OTP).
- `src/lib/useForm.ts`: validates on blur and on submit, then live after a field's first error (including confirm ↔ password).
- `src/components/Field.tsx`: TextField (prefix/suffix), PasswordField (show/hide + live checklist), Checkbox, AuthHeader.
- `src/screens/auth/Register.tsx`, `Login.tsx` (generic error banner, forgot sheet, demo fill buttons), `Verify.tsx` (6 boxes, paste, auto-advance, backspace, shake, 5-try lock, 30s resend + toast, success tick, routes by role, redirects to `#/` with no pending).
- `scripts/checks/s1.mjs` and `s2.mjs`: Playwright checks of every "done when" item (they need `npm run preview` running).

## Not done / partial
- Nothing from S1 or S2 is missing.
- The `repo/` folder is still on disk (empty; see Notes).

## Deviations from the task
- **Commit/push without asking:** Roman told me in chat to commit and push without waiting for a "yes" and to continue with the next session. **Please update CLAUDE.md §2 and the session protocol to match.**
- Package versions: React 19.3, **Vite 8.3**, **TypeScript 7.0** (the native `tsc`; I tested that it catches type errors), Playwright 1.65.
- Deploy workflow: actions updated to checkout@v7, setup-node@v7, configure-pages@v6, upload-pages-artifact@v5, deploy-pages@v5. **Node 26** (matches local, instead of 22), and `npm run typecheck` was added before the build.
- `store.ts`: storage access is wrapped more defensively (getting `localStorage` itself can throw). A storage event with a corrupt value or a `clear()` re-loads safely. `resetDemo()` also sets `#/`, as §8 says.
- `seed.ts`: added `DEMO_CARDS` and `COMMISSION_RATE` constants. IDs and values are unchanged.
- The Register "Continue" button uses `aria-disabled` and a disabled look (not real `disabled`), so a tap still shows every error, as the task requires.
- Register has an extra role error, "Choose how you'll use Plug & Park", when no role is picked.
- Hover styles apply only on `(hover: hover)` devices, so taps never leave a stuck dark button.
- The S1 shot `05-register-placeholder.png` now shows the real Register screen, because S2 replaced the placeholder and `npm run shots -- all` re-shoots S1.

## Checks
- typecheck: pass · build: pass · shots: 19 screenshots (7 for S1, 12 for S2), errors: none.
- `scripts/checks/s1.mjs`: 18/18 pass. This covers frame vs full screen at 390, 520, 1280×720 and 1440×900; persistence; per-window session; live cross-tab reset; deep-link hard refresh; 404; back fallback.
- `scripts/checks/s2.mjs`: 62/62 pass. This covers every validation rule, live re-validation, duplicate email, register → verify → `#/app` → reload, re-login, the generic login error, demo fill, every OTP behaviour (auto-advance, backspace, paste, 5-try lock, resend + toast, the 30s countdown with a fake clock), and sign out per window. No console errors.

## Screenshots (in Claude outputs1/screenshots/S1/ and S2/)
| File | Shows |
|---|---|
| S1/00-framed-1440x900.png | Landing inside the phone frame, caption on the right |
| S1/01-landing.png | Landing at 390×844: night map, headline, stats, CTAs |
| S1/02-demo-sheet.png | Demo controls sheet |
| S1/03-demo-sheet-reset-confirm.png | Reset after the first tap ("Tap again…", red) |
| S1/04-owner-placeholder.png | `#/owner` placeholder signed in as Wong Mei Ling |
| S1/05-register-placeholder.png | Now the real Register screen (see Deviations) |
| S1/06-framed-1280x720.png | Projector size, scaled phone + caption |
| S2/01-register-empty.png | Register, role cards, empty |
| S2/02-register-errors-top.png | Errors after tapping Continue (top) |
| S2/03-register-errors-password.png | Invalid email, weak password checklist, mismatch, terms |
| S2/04-register-valid.png | Valid form, Continue enabled |
| S2/05-register-duplicate-email.png | "An account with this email already exists" |
| S2/06-login-error.png | "Email or password is incorrect" banner |
| S2/07-login-demo-filled.png | Form filled by "Demo driver" |
| S2/08-login-forgot-sheet.png | Forgot password sheet |
| S2/09-verify-empty.png | OTP screen, masked phone, demo code chip |
| S2/10-verify-wrong-code.png | Wrong code error |
| S2/11-verify-success.png | Success tick |
| S2/12-app-new-user.png | `#/app` placeholder for the newly registered user |

## Known bugs / risks
- The framed device uses `transform: scale()`. Leaflet pointer maths needs checking in S3 (as §7 notes).
- Two tabs that are both registering share nothing, which is fine. A user registered in one tab and wiped by a reset in another tab is simply signed out (shown as "Not signed in").

## Notes
- Unexpected item in the repo root: an **empty `repo/` folder**. Left alone; git ignores empty folders.

## Questions for Roman / the reviewer
- No `S3_TASK.md` exists yet. Per Roman's instruction I continue with S3 from the PLAN.md row and CLAUDE.md. The reviewer may want to check it against the plan.

## Commit
- "S1: foundation — phone frame, design system, store, landing, deploy workflow" + "S2: auth — register, login, OTP verification" (combined into one commit; see git log).
