# Progress            Last updated: Thu 12 Nov 2026 (RF-4…RF-10 run in progress)
Repo: https://github.com/Romanearl/plug-and-park (public)
Live URL: https://romanearl.github.io/plug-and-park/      Last green deploy: d2080ba (S10 — final)

## Sessions
- [x] S1 Foundation — done 11 Nov, commit 1607599
- [x] S2 Auth — done 11 Nov, commit 1607599
- [x] S3 Discovery — done 11 Nov (report S3_REPORT.md)
- [x] S4 Booking core — done 11 Nov (S4_REPORT.md)
- [x] S5 Driver path — done 11 Nov (S5_REPORT.md)
- [x] S6 Owner side — done 11 Nov (S6_REPORT.md)
- [x] S7 Onboarding + branches — done 11 Nov (S7_REPORT.md)
- [x] S8 Visual polish — done 11 Nov (S8_REPORT.md)
- [x] S9 Hardening — done 11 Nov (S9_REPORT.md) — FEATURE FREEZE, tag v1.0-freeze
- [x] S10 Demo kit — done 11 Nov (FINAL_REPORT.md, demo-kit/)

## Freeze
- Tag: **v1.0-freeze** → commit d5bb4d7 (pushed)
- Live URL: https://romanearl.github.io/plug-and-park/
- Last green smoke test on the live site: Wed 11 Nov 2026 18:54 HKT (Chromium, full demo path + presenter)
- All sessions done (S1–S10). From now on: only REVIEW_FIXES.md bug fixes.

## Review fixes done
- RF-1 — repo created + pushed, Pages enabled (GitHub Actions source), deploy green, live URL + deep-link refresh (#/owner) verified with Playwright, no console errors.
- RF-2 — `repo/` added to `.gitignore` (folder left in place).
- RF-3 — no S3 work existed before S3_TASK.md; S3 is built directly from the task file.
- RF-4 (195e532) — map fits all matching pins on load / filter change / district / resize, padded for the top overlay, the sheet and the pin size; zoom capped at 15; pan bounds widened so the fitted view still pans. 9 new checks in s3.mjs (phone + presenter view: every pin fully visible).
- RF-5 (4278b16) — tile filter now `grayscale(1) contrast(0.6) brightness(1.3)` (token `--map-filter`, also used by the mini map). Before/after shots in screenshots/RF/.
- RF-6 (bca1dcc) — "Use declined card" button beside "Use test card" (both small grey, one row, visible without scrolling). 3 new checks in s5.mjs.
- RF-7 (1df7f54) — `freeSlotsNear` returns nearest earlier + two nearest later (demo case 09:00, 12:00, 12:30), filling from the other side. 3 new checks in s4.mjs.

## Skipped / needs a human
- (none)
