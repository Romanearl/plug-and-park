// COLOUR-REVERT evidence: copies the after shots of the same 15 screens as RF-14 (run `npm run shots -- all` first)
// to "Claude outputs1/screenshots/COLOUR-REVERT/NN-name-after.png", next to the navy "before" shots from RF14/.
//   node scripts/colour-revert-pairs.mjs
import fs from 'node:fs'
import path from 'node:path'
import { ROOT } from './lib/server.mjs'

const shots = path.join(ROOT, 'Claude outputs1', 'screenshots')
const out = path.join(shots, 'COLOUR-REVERT')
fs.mkdirSync(out, { recursive: true })
const PAIRS = [
  ['01-landing', 'S1/01-landing.png'],
  ['02-map-all-pins', 'S3/01-map-all-pins.png'],
  ['03-map-selected-pin', 'S3/04-pin-selected-preview.png'],
  ['04-map-dark-style', 'S3/14-map-dark-style.png'],
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
  const navy = path.join(shots, 'RF14', `${name.replace('04-map-dark-style', '02-map-all-pins')}-after.png`)
  if (fs.existsSync(navy)) fs.copyFileSync(navy, path.join(out, `${name}-before-navy.png`))
}
console.log(`${PAIRS.length} after shots (+ navy before shots) → ${out}`)
