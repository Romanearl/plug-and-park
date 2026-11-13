// Code review, CR-09: proves that a CSS rule changes nothing on the normal screens.
// Loads every main screen, records every element's box, injects the rule, records again and compares.
//   node scripts/review/wrapdiff.mjs ".app-body { overflow-wrap: anywhere }"
import { chromium } from 'playwright'
const BASE = process.env.PP_BASE ?? 'http://localhost:4173/plug-and-park/'
const RULE = process.argv[2] ?? '.app-body { overflow-wrap: anywhere }'
const b = await chromium.launch()
const boxes = (p) =>
  p.evaluate(() =>
    [...document.querySelectorAll('.app-body *')]
      .filter((el) => !el.closest('.leaflet-container') && !el.closest('svg'))
      .map((el) => {
        const r = el.getBoundingClientRect()
        return `${el.tagName}.${typeof el.className === 'string' ? el.className : ''}|${Math.round(r.x * 10)},${Math.round(r.y * 10)},${Math.round(r.width * 10)},${Math.round(r.height * 10)}`
      }),
  )
let total = 0
let changed = 0
for (const [who, routes] of Object.entries({
  u_driver_demo: ['#/app', '#/app/spot/sp_kwuntong_1', '#/app/spot/sp_saikung_1', '#/app/spot/sp_wanchai_1', '#/app/bookings', '#/app/booking/bk_hist_3', '#/app/booking/bk_w_pending', '#/app/booking/bk_w_declined', '#/app/pay/bk_w_conf', '#/app/confirm/bk_w_paid', '#/app/session/bk_hist_3', '#/app/rate/bk_w_done', '#/app/account'],
  u_owner_demo: ['#/owner', '#/owner/earnings', '#/owner/spots', '#/owner/spots/sp_kwuntong_1', '#/owner/spots/sp_saikung_1', '#/owner/apply', '#/owner/account'],
  '': ['#/', '#/login', '#/register', '#/register?role=owner', '#/nope'],
})) {
  for (const width of [390, 375, 320]) {
    const ctx = await b.newContext({ viewport: { width, height: 844 }, reducedMotion: 'reduce' })
    const p = await ctx.newPage()
    await p.goto(BASE + '#/')
    await p.evaluate((who) => {
      if (who) sessionStorage.setItem('pp.session.main', who)
      const d = JSON.parse(localStorage.getItem('pp.db'))
      const t = new Date(); t.setDate(t.getDate() + 1); t.setHours(16, 0, 0, 0)
      const iso = t.toISOString()
      const mk = (id, status, extra = {}) => d.bookings.push({ id, spotId: 'sp_kwuntong_1', driverId: 'u_driver_demo', ownerId: 'u_owner_demo', start: iso, durationMinutes: 60, price: 30, commissionRate: 0.18, status, createdAt: iso, updatedAt: iso, ...extra })
      mk('bk_w_pending', 'pending'); mk('bk_w_conf', 'confirmed'); mk('bk_w_paid', 'paid', { paymentLast4: '4242', pin: '7350' })
      mk('bk_w_declined', 'declined', { declineReason: 'Charger under maintenance' }); mk('bk_w_done', 'completed', { paymentLast4: '4242', energyKwh: 12, startedAt: iso, completedAt: iso })
      d.payouts.push({ id: 'po_w', ownerId: 'u_owner_demo', amount: 50, method: 'FPS', destination: 'FPS •••• 9876', status: 'paid', createdAt: new Date(Date.now() - 60000).toISOString() })
      localStorage.setItem('pp.db', JSON.stringify(d))
    }, who)
    const visit = async (label, prepare) => {
      if (prepare) await prepare()
      await p.waitForTimeout(700)
      const before = await boxes(p)
      const tag = await p.addStyleTag({ content: RULE })
      await p.waitForTimeout(150)
      const after = await boxes(p)
      await tag.evaluate((el) => el.remove())
      total++
      const diff = before.map((x, i) => (x === after[i] ? null : `${x} → ${(after[i] ?? '').split('|')[1]}`)).filter(Boolean)
      if (diff.length || before.length !== after.length) {
        changed++
        console.log(`CHANGED ${width}px ${label}: ${diff.length} boxes, e.g. ${diff.slice(0, 3).join(' ; ')}`)
      }
    }
    for (const r of routes) {
      await p.goto('about:blank')
      await p.goto(BASE + r)
      await visit(r)
    }
    if (who === 'u_driver_demo') {
      await p.goto(BASE + '#/app/spot/sp_kwuntong_1')
      await visit('booking sheet', async () => { await p.getByRole('button', { name: 'Request booking', exact: true }).click(); await p.getByRole('button', { name: 'Tomorrow', exact: true }).click(); await p.getByRole('button', { name: '10:00', exact: true }).click() })
      await p.goto(BASE + '#/app')
      await visit('district sheet', () => p.getByRole('button', { name: /Where do you need/ }).click())
      await p.goto(BASE + '#/app/bookings')
      await visit('bookings past', () => p.getByRole('tab', { name: 'Past' }).click())
      await visit('demo sheet', () => p.getByRole('button', { name: /Demo only/ }).click())
    }
    if (who === 'u_owner_demo') {
      await p.goto(BASE + '#/owner/earnings')
      await visit('withdraw sheet', () => p.getByRole('button', { name: 'Withdraw', exact: true }).click())
      await p.goto(BASE + '#/owner')
      await visit('decline sheet', () => p.getByRole('button', { name: 'Decline' }).first().click())
      await p.goto(BASE + '#/owner/earnings')
      await visit('breakdown open', () => p.locator('.tx-row .tx-main').first().click())
    }
    await ctx.close()
  }
}
await b.close()
console.log(`${total - changed}/${total} screens identical with the rule: ${RULE}`)
process.exit(changed ? 1 : 0)
