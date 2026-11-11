// Checks the S4 "done when" items. Run via `npm run check` (or with `npm run preview` running: node scripts/checks/s4.mjs)
import { chromium } from 'playwright'
import { createServer } from 'vite'

const BASE = process.env.PP_BASE ?? 'http://localhost:4173/plug-and-park/'
const results = []
const check = (name, ok, extra = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? ' - ' + extra : ''}`)
const seen = (loc, timeout = 4000) => loc.waitFor({ timeout }).then(() => true, () => false)
const IGNORE = /tile\.openstreetmap|basemaps\.cartocdn|fonts\.g|ERR_FAILED|net::/

// ── 1. Pure booking rules (loaded through Vite so extensionless imports resolve) ──
{
  const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' })
  try {
    const bk = await vite.ssrLoadModule('/src/lib/booking.ts')
    const spot = { id: 'sp', availability: [0, 1, 2, 3, 4, 5, 6].map((day) => ({ day, start: '07:00', end: '22:00' })) }
    const tomorrow = (h, m = 0) => {
      const d = new Date()
      d.setDate(d.getDate() + 1)
      d.setHours(h, m, 0, 0)
      return d
    }
    const blk = { id: 'b1', spotId: 'sp', start: tomorrow(10).toISOString(), durationMinutes: 120, status: 'paid' }
    const pend = { id: 'b2', spotId: 'sp', start: tomorrow(15).toISOString(), durationMinutes: 60, status: 'pending' }
    const all = [blk, pend]
    check('isWithinAvailability 21:00 1h ok / 21:30 1h no', bk.isWithinAvailability(spot, tomorrow(21), 60) && !bk.isWithinAvailability(spot, tomorrow(21, 30), 60))
    check('hasConflict 11:00 1h vs paid 10–12', bk.hasConflict('sp', tomorrow(11), 60, all))
    check('hasConflict 09:30 1h overlaps', bk.hasConflict('sp', tomorrow(9, 30), 60, all))
    check('no conflict 12:00 (touching end)', !bk.hasConflict('sp', tomorrow(12), 60, all))
    check('pending request does not block', !bk.hasConflict('sp', tomorrow(15), 60, all))
    check("checkSlot: ok / taken / closed / past", bk.checkSlot(spot, tomorrow(13), 60, all) === 'ok' && bk.checkSlot(spot, tomorrow(10), 60, all) === 'taken' && bk.checkSlot(spot, tomorrow(6), 60, all) === 'closed' && bk.checkSlot(spot, new Date(Date.now() - 3600e3), 60, all) === 'past')
    const near = bk.freeSlotsNear(spot, tomorrow(10), 60, all, 3).map(bk.hhmm)
    check('freeSlotsNear 10:00 → 3 free nearby times', near.length === 3 && near.every((t) => !['09:30', '10:00', '10:30', '11:00', '11:30'].includes(t)), near.join(','))
    check('Transitions: pending→confirmed ok; declined→confirmed / completed→pending / cancelled→paid refused',
      bk.canTransition('pending', 'confirmed') && !bk.canTransition('declined', 'confirmed') && !bk.canTransition('completed', 'pending') && !bk.canTransition('cancelled', 'paid'))
  } finally {
    await vite.close()
  }
}

// ── Browser helpers ──
const browser = await chromium.launch()
const errors = []
const watch = (p) => {
  p.on('pageerror', (e) => errors.push(e.message))
  p.on('console', (m) => m.type() === 'error' && !IGNORE.test(m.text()) && errors.push(m.text()))
}
async function tab(ctx, user) {
  const p = await ctx.newPage()
  watch(p)
  await p.addInitScript((uid) => {
    try {
      sessionStorage.getItem('pp.session.main') || sessionStorage.setItem('pp.session.main', uid)
    } catch {}
  }, user)
  return p
}
const pendingCount = (p) => p.evaluate(() => JSON.parse(localStorage.getItem('pp.db')).bookings.filter((b) => b.status === 'pending').length)
const bookingCount = (p) => p.evaluate(() => JSON.parse(localStorage.getItem('pp.db')).bookings.length)

/** Driver: open Kwun Tong, pick tomorrow + time + duration, tap Request. */
async function request(p, time, dur = '1 h', frame = p) {
  const root = frame
  const sheet = root.getByRole('dialog', { name: 'Request booking' })
  if (!(await sheet.isVisible().catch(() => false))) await root.getByRole('button', { name: 'Request booking' }).click()
  await sheet.getByRole('button', { name: 'Tomorrow', exact: true }).click()
  await sheet.getByRole('button', { name: time, exact: true }).click()
  await sheet.getByRole('button', { name: dur, exact: true }).click()
  await sheet.getByRole('button', { name: /^Request booking ·/ }).click()
  return sheet
}

// ── 2. Request / unavailable / approve / decline / cancel across two tabs ──
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const owner = await tab(ctx, 'u_owner_demo')
  await owner.goto(BASE + '#/owner')
  check('Owner requests: header + 1 seeded request', (await seen(owner.getByRole('heading', { name: 'Hi, Mei Ling' }))) && (await seen(owner.getByText('1 request waiting'))))
  check('Owner tab badge shows pending count', (await owner.locator('.tab-badge').textContent()) === '1')

  const driver = await tab(ctx, 'u_driver_demo')
  await driver.goto(BASE + '#/app/spot/sp_kwuntong_1')
  const before = await bookingCount(driver)

  // Unavailable slots (No branch): 10:00, 11:00 and 09:30 for 1 h overlap the paid 10:00–12:00 booking.
  for (const t of ['10:00', '11:00', '09:30']) {
    const sheet = await request(driver, t)
    check(`Checking availability… state (${t})`, await seen(sheet.getByText('Checking availability…'), 1000))
    const ok = await seen(sheet.getByText('This slot is no longer available'), 3000)
    const sugg = await sheet.locator('.notice .btn').count()
    check(`Tomorrow ${t} 1 h → "no longer available" + ${sugg} suggestions`, ok && sugg > 0 && sugg <= 3)
  }
  check('Unavailable requests created nothing', (await bookingCount(driver)) === before)
  // Picking a suggestion selects it
  const sheet = driver.getByRole('dialog', { name: 'Request booking' })
  const sugText = await sheet.locator('.notice .btn').first().textContent()
  await sheet.locator('.notice .btn').first().click()
  check('Tapping a suggestion selects that time', (await sheet.locator('.time-chip.active').textContent()) === sugText)
  await sheet.getByRole('button', { name: 'Close' }).click()

  // Valid request: tomorrow 13:00 for 1 h
  await request(driver, '13:00')
  await driver.waitForURL(/#\/app\/booking\/bk_/, { timeout: 5000 })
  const bid = driver.url().split('/').pop()
  check('Request 13:00 1 h → pending status screen', await seen(driver.locator('.status-card[data-status="pending"]')))
  check('Pending card: "Waiting for Wong Mei Ling to approve"', await seen(driver.getByText('Waiting for Wong Mei Ling to approve')))
  check('Stepper: Requested is current', (await driver.locator('.stepper li.current .label').textContent()) === 'Requested')
  check('Owner gets toast "New booking request"', await seen(owner.getByText('New booking request'), 3000))
  const card = owner.locator(`.request-card[data-booking="${bid}"]`)
  check('Pending on owner side, live', await seen(card, 3000))
  check('Card shows driver rating + ratings count + vehicle', (await card.textContent()).includes('4.9') && (await card.textContent()).includes('23 ratings') && (await card.textContent()).includes('Tesla Model Y'))
  // S6 §1: the card now shows the net after both fees.
  check('Card shows "You earn HK$23.70" after 18% service + 3% payment fee', (await card.textContent()).includes('You earn HK$23.70') && (await card.textContent()).includes('after 18% service fee and 3% payment fee'))
  check('Owner header "2 requests waiting"', await seen(owner.getByText('2 requests waiting')))

  // Approve → driver flips live
  await card.getByRole('button', { name: 'Approve' }).click()
  check('Owner card shows approve success state', await seen(card.getByText('Approved — the driver has been notified'), 1500))
  const t0 = Date.now()
  const flipped = await seen(driver.locator('.status-card[data-status="confirmed"]'), 1500)
  check('Driver status flips to Approved live (< 1.5 s)', flipped, `${Date.now() - t0} ms`)
  check('Driver sees "Approved! Pay to confirm" + Pay HK$30', (await seen(driver.getByText('Approved! Pay to confirm your booking'))) && (await seen(driver.getByRole('button', { name: 'Pay HK$30' }))))
  check('Driver toast "Booking approved — pay to confirm"', await seen(driver.getByText('Booking approved — pay to confirm')))
  check('Approved booking moves to Upcoming ("Awaiting payment")', await seen(owner.locator(`.upcoming-list [data-booking="${bid}"]`).getByText('Awaiting payment'), 3000))
  check('No Cancel on a confirmed booking', (await driver.getByRole('button', { name: /Cancel request/ }).count()) === 0)

  // Decline → driver sees reason live
  await driver.goto(BASE + '#/app/spot/sp_kwuntong_1')
  await request(driver, '15:00')
  await driver.waitForURL(/#\/app\/booking\/bk_/, { timeout: 5000 })
  const bid2 = driver.url().split('/').pop()
  const card2 = owner.locator(`.request-card[data-booking="${bid2}"]`)
  await card2.getByRole('button', { name: 'Decline' }).click({ timeout: 4000 })
  await owner.getByRole('dialog', { name: 'Decline request' }).getByRole('button', { name: 'Charger under maintenance' }).click()
  check('Decline → driver status declined live with reason', (await seen(driver.locator('.status-card[data-status="declined"]'), 1500)) && (await seen(driver.getByText(/Charger under maintenance/))))
  check('Driver toast "Booking declined"', await seen(driver.getByText('Booking declined')))

  // Cancel only while pending
  await driver.goto(BASE + '#/app/spot/sp_kwuntong_1')
  await request(driver, '17:00')
  await driver.waitForURL(/#\/app\/booking\/bk_/, { timeout: 5000 })
  await driver.getByRole('button', { name: 'Cancel request' }).click()
  await driver.getByRole('button', { name: 'Tap again to cancel request' }).click()
  check('Cancel (two taps) → "You cancelled this request"', await seen(driver.getByText('You cancelled this request')))
  const bid3 = driver.url().split('/').pop()
  check('Cancelled request disappears from owner list', await owner.locator(`.request-card[data-booking="${bid3}"]`).waitFor({ state: 'detached', timeout: 3000 }).then(() => true, () => false))

  // Approve a request whose slot got taken meanwhile → declined with reason
  await driver.goto(BASE + '#/app/spot/sp_kwuntong_1')
  await request(driver, '19:00')
  await driver.waitForURL(/#\/app\/booking\/bk_/, { timeout: 5000 })
  const a = driver.url().split('/').pop()
  await driver.goto(BASE + '#/app/spot/sp_kwuntong_1')
  await request(driver, '19:30')
  await driver.waitForURL(/#\/app\/booking\/bk_/, { timeout: 5000 })
  const b = driver.url().split('/').pop()
  await owner.locator(`.request-card[data-booking="${a}"]`).getByRole('button', { name: 'Approve' }).click({ timeout: 4000 })
  await owner.waitForTimeout(1300)
  await owner.locator(`.request-card[data-booking="${b}"]`).getByRole('button', { name: 'Approve' }).click({ timeout: 4000 })
  check('Approving an overlapping request → owner sees "declined automatically"', await seen(owner.getByText(/Declined automatically: slot no longer available/)))
  check('…and the driver sees reason "Slot no longer available"', (await seen(driver.locator('.status-card[data-status="declined"]'), 2000)) && (await seen(driver.getByText(/Slot no longer available/))))
  await ctx.close()
}

// ── 3. Owner empty state ──
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const owner = await tab(ctx, 'u_owner_demo')
  await owner.goto(BASE + '#/owner')
  await owner.locator('.request-card').first().getByRole('button', { name: 'Decline' }).click()
  await owner.getByRole('button', { name: 'I need the bay myself' }).click()
  check('Owner empty state', await seen(owner.getByText('No requests right now')))
  check('Badge disappears with 0 pending', (await owner.locator('.tab-badge').count()) === 0)
  await owner.getByRole('button', { name: 'Earnings' }).click()
  check('Owner tabs: Earnings placeholder', await seen(owner.getByRole('heading', { name: 'Earnings' })))
  await owner.getByRole('button', { name: 'Account' }).click()
  check('Owner tabs: Account (no vehicle row)', (await seen(owner.getByText('owner@plugpark.demo'))) && (await owner.getByText('Vehicle').count()) === 0)
  await ctx.close()
}

// ── 4. Presenter view at 1280×720 ──
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } })
  const p = await ctx.newPage()
  watch(p)
  await p.goto(BASE + '#/presenter')
  const frames = await p.locator('iframe').count()
  check('Presenter: two iframes', frames === 2)
  const boxes = await p.locator('.device').evaluateAll((els) => els.map((e) => e.getBoundingClientRect()).map((r) => [r.left, r.top, r.right, r.bottom]))
  check('Presenter: both phones fit inside 1280×720', boxes.every(([l, t, r, bt]) => l >= 0 && t >= 0 && r <= 1280 && bt <= 720), JSON.stringify(boxes.map((b) => b.map(Math.round))))
  const d = p.frameLocator('iframe[name="driver"]')
  const o = p.frameLocator('iframe[name="owner"]')
  check('Presenter: driver frame signed in (map)', await seen(d.locator('.pin').first(), 8000))
  check('Presenter: owner frame signed in (requests)', await seen(o.getByRole('heading', { name: 'Hi, Mei Ling' }), 8000))
  check('Presenter: fake status bar inside the frames', (await d.locator('.status-bar').count()) === 1)
  const df = p.frame({ name: 'driver' })
  await df.evaluate(() => (location.hash = '#/app/spot/sp_kwuntong_1'))
  await request(p, '13:00', '1 h', d)
  await df.waitForURL(/#\/app\/booking\/bk_/, { timeout: 5000 })
  const id = df.url().split('/').pop()
  check('Presenter: request appears in owner frame', await seen(o.locator(`.request-card[data-booking="${id}"]`), 3000))
  await o.locator(`.request-card[data-booking="${id}"]`).getByRole('button', { name: 'Approve' }).click()
  const t0 = Date.now()
  check('Presenter: approve flips driver frame within 1 s', await seen(d.locator('.status-card[data-status="confirmed"]'), 1000), `${Date.now() - t0} ms`)
  await p.getByRole('button', { name: 'Reset demo' }).click()
  check('Presenter Reset: owner back to 1 seeded request', await seen(o.getByText('1 request waiting'), 8000))
  check('Presenter Reset: driver frame back on the map', await seen(d.locator('.pin').first(), 8000))
  check('Presenter Reset: frames keep separate logins', (await seen(d.getByRole('button', { name: 'Explore' }))) && (await seen(o.getByRole('button', { name: 'Requests' }))))
  await p.getByRole('button', { name: 'Single phone' }).click()
  check('"Single phone" → landing', await seen(p.getByText('Charge where')))
  await p.setViewportSize({ width: 800, height: 700 })
  await p.goto(BASE + '#/presenter')
  check('Presenter < 900px → laptop message', await seen(p.getByText('The presenter view needs a laptop-size screen.')))
  await ctx.close()
}

// ── 5. Demo sheet link (framed only) ──
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } })
  const p = await ctx.newPage()
  await p.goto(BASE + '#/')
  await p.getByRole('button', { name: /Demo only/ }).click()
  await p.getByRole('button', { name: 'Open presenter view (two phones)' }).click()
  check('Demo sheet → presenter view', await seen(p.locator('iframe[name="owner"]')))
  await ctx.close()
  const c2 = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const q = await c2.newPage()
  await q.goto(BASE + '#/')
  await q.getByRole('button', { name: /Demo only/ }).click()
  check('Presenter link hidden on a phone', (await q.getByRole('button', { name: 'Open presenter view (two phones)' }).count()) === 0)
  await c2.close()
}

await browser.close()
if (errors.length) results.push('FAIL  console/page errors: ' + [...new Set(errors)].join(' | '))
console.log(results.join('\n'))
console.log(`\n${results.filter((r) => r.startsWith('PASS')).length}/${results.length} passed`)
process.exit(results.some((r) => r.startsWith('FAIL')) ? 1 : 0)
