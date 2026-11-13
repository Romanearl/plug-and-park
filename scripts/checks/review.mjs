// Code review (CODE_REVIEW_TASK.md) regression checks: one block per finding, named after its ID.
// Run via `npm run check` (or with `npm run preview` running: node scripts/checks/review.mjs)
import { chromium } from 'playwright'

const BASE = process.env.PP_BASE ?? 'http://localhost:4173/plug-and-park/'
const results = []
const check = (name, ok, extra = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? ' - ' + extra : ''}`)
const seen = (loc, timeout = 5000) => loc.waitFor({ timeout }).then(() => true, () => false)
const IGNORE = /tile\.openstreetmap|basemaps\.cartocdn|fonts\.g|ERR_FAILED|ERR_INTERNET_DISCONNECTED|net::/
const browser = await chromium.launch()
const errors = []
const PHONE = { viewport: { width: 390, height: 844 } }

async function page(ctx, user) {
  const p = await ctx.newPage()
  p.on('pageerror', (e) => errors.push(e.message))
  p.on('console', (m) => (m.type() === 'error' || m.type() === 'warning') && !IGNORE.test(m.text()) && errors.push(`${m.type()}: ${m.text()}`))
  if (user)
    await p.addInitScript((u) => {
      try {
        sessionStorage.getItem('pp.session.main') || sessionStorage.setItem('pp.session.main', u)
      } catch {}
    }, user)
  return p
}
const db = (p) => p.evaluate(() => JSON.parse(localStorage.getItem('pp.db')))
/** Adds a booking for the demo driver at Hoi Bun Road, tomorrow 16:00, straight into storage. */
async function addBooking(p, id, status, extra = {}) {
  await p.evaluate(
    ([id, status, extra]) => {
      const d = JSON.parse(localStorage.getItem('pp.db'))
      const t = new Date()
      t.setDate(t.getDate() + 1)
      t.setHours(16, 0, 0, 0)
      const iso = t.toISOString()
      d.bookings.push({ id, spotId: 'sp_kwuntong_1', driverId: 'u_driver_demo', ownerId: 'u_owner_demo', start: iso, durationMinutes: 60, price: 30, commissionRate: 0.18, status, createdAt: iso, updatedAt: iso, ...extra })
      localStorage.setItem('pp.db', JSON.stringify(d))
    },
    [id, status, extra],
  )
}
/** A real press at a given height of the element (0 = top edge, 1 = bottom edge), with the button held for a moment. */
async function press(p, loc, fy = 0.5) {
  const b = await loc.boundingBox()
  await p.mouse.move(b.x + b.width / 2, b.y + b.height * fy)
  await p.mouse.down()
  await p.waitForTimeout(60)
  await p.mouse.up()
  await p.waitForTimeout(200)
}

// CR-01 — a tap right after typing in a field was lost: the field's error appeared on blur, moved the
// buttons below it while the finger was still down, and the press ended on a different element.
{
  const ctx = await browser.newContext(PHONE)
  const p = await page(ctx, 'u_driver_demo')
  await p.goto(BASE + '#/app/bookings')
  await p.locator('.booking-card, .empty-state').first().waitFor()
  await addBooking(p, 'bk_cr01', 'confirmed')
  const filled = []
  for (const fy of [0.15, 0.5, 0.85]) {
    await p.goto('about:blank')
    await p.goto(BASE + '#/app/pay/bk_cr01')
    await p.getByLabel('Card number').click()
    await press(p, p.getByRole('button', { name: 'Use test card' }), fy)
    filled.push((await p.getByLabel('Card number').inputValue()) === '4242 4242 4242 4242')
  }
  check('CR-01 Payment: "Use test card" works right after tapping into the card field (top, middle, bottom of the button)', filled.every(Boolean), filled.join(','))
  check('CR-01 Payment: …and the filled form shows no stale error', (await p.locator('.field-error').count()) === 0 && (await p.locator('.bottom-bar .btn').getAttribute('aria-disabled')) === 'false')
  // The blur error itself still shows (after the tap that caused the blur).
  await p.goto('about:blank')
  await p.goto(BASE + '#/app/pay/bk_cr01')
  await p.getByLabel('Card number').fill('1234')
  await press(p, p.getByRole('heading', { name: 'Payment' }))
  check('CR-01 Payment: leaving a wrong card number still shows its error', await seen(p.getByText('Enter a valid card number'), 1500))
  await p.getByLabel('CVC').focus()
  await p.keyboard.press('Tab')
  check('CR-01 Payment: keyboard Tab out of an empty field shows its error at once', await seen(p.getByText('Enter the 3-digit security code'), 300))
  await ctx.close()

  const ctx2 = await browser.newContext(PHONE)
  const q = await page(ctx2)
  const demo = []
  for (const fy of [0.15, 0.5, 0.85]) {
    await q.goto('about:blank')
    await q.goto(BASE + '#/login')
    await q.getByLabel('Email').click()
    await press(q, q.getByRole('button', { name: /Demo driver/ }), fy)
    demo.push((await q.getByLabel('Email').inputValue()) === 'driver@plugpark.demo')
  }
  check('CR-01 Login: "Demo driver" works right after tapping into the email field', demo.every(Boolean), demo.join(','))
  await q.goto('about:blank')
  await q.goto(BASE + '#/login')
  await q.getByLabel('Password', { exact: true }).click()
  await press(q, q.getByRole('button', { name: 'Forgot password?' }), 0.3)
  check('CR-01 Login: "Forgot password?" opens right after tapping into the password field', await seen(q.getByRole('dialog', { name: 'Forgot password?' }), 1500))
  await ctx2.close()
}

// CR-02 — a link with a broken %-escape crashed the whole app (blank page, "URI malformed").
{
  const ctx = await browser.newContext(PHONE)
  const p = await page(ctx, 'u_driver_demo')
  const before = errors.length
  await p.goto(BASE + '#/app/spot/%E0%A4%A')
  check('CR-02 #/app/spot/%E0%A4%A shows "no longer listed" instead of a blank page', (await seen(p.getByText('This charger is no longer listed'), 3000)) && errors.length === before, errors.slice(before).join(' | '))
  await p.goto('about:blank')
  await p.goto(BASE + '#/owner/spots/%ZZ')
  check('CR-02 #/owner/spots/%ZZ (wrong role, broken escape) still lands on a real screen', await seen(p.locator('.map-home, .spot-card').first(), 5000))
  await ctx.close()
}

// CR-03 — stored data with the right version but the wrong shape crashed every load until storage was cleared by hand.
{
  const bad = ['{"version":5}', '{"version":5,"users":[],"spots":{},"bookings":[],"reviews":[],"payouts":[]}', '{"version":5,"users":[],"spots":[],"bookings":[]}']
  const ok = []
  for (const value of bad) {
    const ctx = await browser.newContext(PHONE)
    const p = await page(ctx, 'u_driver_demo')
    await p.addInitScript((v) => {
      if (!sessionStorage.getItem('cr03')) {
        sessionStorage.setItem('cr03', '1')
        localStorage.setItem('pp.db', v)
      }
    }, value)
    const before = errors.length
    await p.goto(BASE + '#/app/bookings')
    const rendered = await seen(p.locator('.booking-card, .empty-state').first(), 4000)
    const d = await db(p)
    ok.push(rendered && d.spots.length === 12 && d.users.length === 7 && errors.length === before)
    await ctx.close()
  }
  check('CR-03 wrong-shaped stored data is replaced by fresh demo data (3 shapes)', ok.every(Boolean), ok.join(','))
  // A second window writing such data must not take this one down either.
  const ctx = await browser.newContext(PHONE)
  const p = await page(ctx, 'u_driver_demo')
  const q = await page(ctx, 'u_driver_demo')
  await p.goto(BASE + '#/app/bookings')
  await q.goto(BASE + '#/app/bookings')
  await p.locator('.booking-card, .empty-state').first().waitFor()
  const before = errors.length
  for (const v of bad) {
    await q.evaluate((v) => localStorage.setItem('pp.db', v), v)
    await p.waitForTimeout(250)
  }
  await p.getByRole('tab', { name: 'Past' }).click({ timeout: 3000 }).catch(() => {})
  check('CR-03 …also when another window writes it while this one is open', (await seen(p.locator('.booking-card').first(), 3000)) && errors.length === before, errors.slice(before).join(' | '))
  await ctx.close()
}

// CR-04 — two windows saving at almost the same moment: the second one wrote its own (older) copy of the
// data and silently dropped the first one's change. Simulated by delaying the storage events of the owner window.
{
  const ctx = await browser.newContext(PHONE)
  const d = await page(ctx, 'u_driver_demo')
  const o = await ctx.newPage()
  o.on('pageerror', (e) => errors.push(e.message))
  await o.addInitScript(() => {
    try {
      sessionStorage.getItem('pp.session.main') || sessionStorage.setItem('pp.session.main', 'u_owner_demo')
    } catch {}
    // This window hears about other windows' changes only when the test says so.
    window.addEventListener('storage', (e) => window.__deaf && e.stopImmediatePropagation(), true)
  })
  await o.goto(BASE + '#/owner/spots')
  await o.locator('.owner-spot[data-spot="sp_shatin_1"]').waitFor()
  await o.evaluate(() => (window.__deaf = true))
  await d.goto(BASE + '#/app/spot/sp_kwuntong_1')
  await d.getByRole('button', { name: 'Request booking', exact: true }).click()
  const s = d.getByRole('dialog', { name: 'Request booking' })
  await s.getByRole('button', { name: 'Tomorrow', exact: true }).click()
  await s.getByRole('button', { name: '13:00', exact: true }).click()
  await s.getByRole('button', { name: /^Request booking ·/ }).click()
  await d.locator('.status-card[data-status="pending"]').waitFor()
  const id = d.url().split('/').pop()
  // The owner window hasn't heard of the request yet, and saves a change of its own.
  await o.locator('.owner-spot[data-spot="sp_shatin_1"] .switch').click()
  await o.waitForTimeout(300)
  const after = await db(o)
  const kept = after.bookings.some((b) => b.id === id)
  check('CR-04 a save from a window with stale data keeps the other window’s new booking', kept && after.spots.find((x) => x.id === 'sp_shatin_1').active === false, `booking kept: ${kept}`)
  check('CR-04 …and the driver still sees the pending request', await seen(d.locator('.status-card[data-status="pending"]'), 1500))
  await o.goto(BASE + '#/owner')
  check('CR-04 …and it shows up for the owner', await seen(o.locator(`.request-card[data-booking="${id}"]`), 3000))
  await ctx.close()
}

await browser.close()
check('No console errors or warnings during the review checks', errors.length === 0, [...new Set(errors)].slice(0, 5).join(' | '))
console.log(results.join('\n'))
const failed = results.filter((r) => r.startsWith('FAIL')).length
console.log(`\n${results.length - failed}/${results.length} passed`)
process.exit(failed ? 1 : 0)
