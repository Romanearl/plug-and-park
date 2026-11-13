// npm run check            → build, start preview, run every scripts/checks/s*.mjs + contrast.mjs (RF-14) + review.mjs (code review)
// npm run check -- s3      → only the named check file(s)
// Exits non-zero if any check fails. The preview server is always stopped.

import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { BASE, ROOT, build, startPreview } from './lib/server.mjs'

const dir = path.join(ROOT, 'scripts', 'checks')
const only = process.argv.slice(2).map((s) => s.toLowerCase().replace(/\.mjs$/, ''))
const files = fs
  .readdirSync(dir)
  .filter((f) => /^s\d+\.mjs$/.test(f) || f === 'contrast.mjs' || f === 'review.mjs')
  .filter((f) => only.length === 0 || only.includes(f.replace(/\.mjs$/, '')))
  .sort((a, b) => (parseInt(a.slice(1)) || 99) - (parseInt(b.slice(1)) || 99) || a.localeCompare(b))

build()
const stop = await startPreview()
let failed = 0
try {
  for (const f of files) {
    console.log(`\n── ${f} ─────────────────────────────`)
    const r = spawnSync(process.execPath, [path.join(dir, f)], {
      cwd: ROOT,
      stdio: 'inherit',
      env: { ...process.env, PP_BASE: BASE },
    })
    if (r.status !== 0) failed++
  }
} finally {
  stop()
}
console.log(failed ? `\n✗ ${failed} of ${files.length} check file(s) failed` : `\n✓ all ${files.length} check files passed`)
process.exit(failed ? 1 : 0)
