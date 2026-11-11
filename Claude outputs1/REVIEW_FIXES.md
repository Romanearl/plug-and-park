# Review fixes (written by the reviewer — Claude Code must not edit this file)

Do every open item here **before** continuing with the current session. An item is open until its ID appears under "Review fixes done" in `PROGRESS.md`.

## Review of S1 + S2 — 11 Nov 2026: approved

Checked `S1_REPORT.md` and the S1/S2 screenshots against the task, the design system and the course guidelines. The foundation, landing, phone frame, demo sheet, and the register / login / verification screens match the spec. The deviations listed in the report are accepted (newer tool versions, `aria-disabled` on Continue, the extra role error, hover only on hover devices).

### RF-1 — Report the GitHub state
`S1_REPORT.md` doesn't say whether the repo was created and pushed. Record in `PROGRESS.md`: the repo URL, the live URL, and whether the last Actions run was green. If the repo doesn't exist yet, create it and enable Pages as described in CLAUDE.md §9.

### RF-2 — Ignore the empty `repo/` folder
The empty `repo/` folder in the project root isn't part of the project. Don't delete it (that's Roman's call), but add `repo/` to `.gitignore` so it can never be committed by accident.

### RF-3 — S3 was started without a task file
`S3_TASK.md` now exists. Do a gap pass of whatever S3 work exists against it before moving on to S4.
