// RF-14 evidence: node scripts/rf14-pairs.mjs <before|after>
// Copies the listed session screenshots (run `npm run shots -- all` first) to
// "Claude outputs1/screenshots/RF14/NN-name-<before|after>.png".
import fs from 'node:fs'
import path from 'node:path'
import { ROOT } from './lib/server.mjs'

const label = process.argv[2]
if (label !== 'before' && label !== 'after') throw new Error('usage: node scripts/rf14-pairs.mjs <before|after>')
const shots = path.join(ROOT, 'Claude outputs1', 'screenshots')
const out = path.join(shots, 'RF14')
fs.mkdirSync(out, { recursive: true })

const PAIRS = [
  ['01-landing', 'S1/01-landing.png'],
  ['02-map-all-pins', 'S3/01-map-all-pins.png'],
  ['03-map-selected-pin', 'S3/04-pin-selected-preview.png'],
  // The Light map style only exists after RF-14; its "before" is the old (light) map.
  ['04-map-light-style', label === 'after' ? 'S3/14-map-light-style.png' : 'S3/01-map-all-pins.png'],
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
for (const [name, src] of PAIRS) fs.copyFileSync(path.join(shots, ...src.split('/')), path.join(out, `${name}-${label}.png`))
console.log(`${PAIRS.length} "${label}" screenshots → ${out}`)
