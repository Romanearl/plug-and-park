# Handoff — S1 not started yet (environment setup only)          Date: Wed 11 Nov 2026

## For the next Claude Code session — start here
1. Read `Claude outputs1/CLAUDE.md`, `Claude outputs1/PLAN.md` and `Claude outputs1/S1_TASK.md` as usual.
2. Read this file, then check the "Still open" items below with Roman **before** writing any code.
3. When they're resolved, do S1_TASK.md: Part A first, then Part B (S2) only if every Part A check passes. Follow the session protocol and stop when the report is written.

## Status
- **No project work has been done yet.** There's no git init, no scaffold and no files outside `Claude outputs1/`.
- The previous session only checked the machine and installed tools.

## Environment (checked 11 Nov)
| Item | State |
|---|---|
| Git | 2.56.0, global user `Roman` (email set) |
| Node.js | **Upgraded from v16.19.1 to v26.13.0 LTS** via winget (Vite and Playwright needed ≥ 20). Verify with `node --version` after the restart; if it still shows v16, the PATH hasn't refreshed. |
| npm | Was 8.19.3 with Node 16; should now be the one bundled with Node 26 |
| GitHub CLI (`gh`) | **Installed** (v2.103.3) via winget. **Not logged in yet.** |
| winget tip | Always add `--source winget --accept-source-agreements --accept-package-agreements`. Otherwise the msstore terms prompt fails in the non-interactive shell. |

## Still open (ask Roman first)
1. **Restart Claude Code** so the new Node and `gh` are on PATH. Done if `node --version` shows v26 and `gh --version` works.
2. **GitHub login:** Roman runs `! gh auth login` (GitHub.com → HTTPS → Login with a web browser). Check with `gh auth status`.
3. **GitHub username** is unknown. It's needed for the README live-demo URL `https://<username>.github.io/plug-and-park/`. If Roman is logged in, `gh api user --jq .login` returns it.
4. **Repo timing:** create the public repo `plug-and-park` now (empty, no push) or only after the session, when Roman says "yes" to the first push? The default is to **wait**, per CLAUDE.md §2 and S1_TASK A7.
5. After the first push, Pages must be set to Settings → Pages → Source: **GitHub Actions**. Roman does this, or Claude does it via `gh api` with his OK.

## Notes for the S1 report
- **Unexpected item in the repo root:** an empty folder `repo/`. It must be left alone (S1_TASK A0); list it in the report.
- Deploy workflow: local Node is 26, but the workflow pins `node-version: 22` (S1_TASK A7). Consider 24 or 26 to match local, and note it under Deviations if changed. Check the action versions are current, as A7 asks.
