// NAVY-RESTORE evidence: copies the after shots of the same 15 screens as RF-14 / COLOUR-REVERT
// (run `npm run shots -- all` first) to "Claude outputs1/screenshots/NAVY-RESTORE/NN-name-after.png",
// next to their v1.2.1-review counterparts (the "…-before-navy.png" shots in COLOUR-REVERT/).
//   node scripts/navy-restore-pairs.mjs
import fs from 'node:fs'
import path from 'node:path'
import { ROOT } from './lib/server.mjs'

const shots = path.join(ROOT, 'Claude outputs1', 'screenshots')
const out = path.join(shots, 'NAVY-RESTORE')
fs.mkdirSync(out, { recursive: true })
const PAIRS = [
  ['01-landing', 'S1/01-landing.png'],
  ['02-map-all-pins', 'S3/01-map-all-pins.png'],
  ['03-map-selected-pin', 'S3/04-pin-selected-preview.png'],
  ['04-map-light-style', 'S3/14-map-light-style.png'],
  ['05-spot-details', 'S3/08-spot-details-top.png'],
  ['06-booking-slot-chosen', 'S4/02-booking-sheet-slot-chosen.png'],
  ['07-booking-approved', 'S4/06-status-confirmed.png'],
  ['08-payment', 'S5/03-payment-test-card.png'],
  ['09-qr-pin', 'S5/06-confirmation-qr-pin.png'],
  ['10-charging-session', 'S5/07-session-20pct.png'],
  ['11-owner-requests', 'S4/09-owner-requests-2-pending.png'],
  ['12-owner-earnings-top', 'S6/01-earnings.png'],
  ['13-owner-earnings-breakdown', 'S6/02-transaction-expanded.png'],
  ['14-scheduler', 'S6/11-scheduler-default.png'],
  ['15-presenter-1280x720', 'S4/13-presenter-1280x720-before-approve.png'],
]
for (const [name, src] of PAIRS) {
  fs.copyFileSync(path.join(shots, ...src.split('/')), path.join(out, `${name}-after.png`))
  // v1.2.1-review counterpart. Its 04 was the dark map (the default then); the light style had no RF-14 shot.
  const before = path.join(shots, 'COLOUR-REVERT', `${name.replace('04-map-light-style', '04-map-dark-style')}-before-navy.png`)
  if (fs.existsSync(before)) fs.copyFileSync(before, path.join(out, `${name}-before-v1.2.1.png`))
}
console.log(`${PAIRS.length} after shots (+ v1.2.1-review before shots) → ${out}`)
