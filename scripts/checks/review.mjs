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

await browser.close()
check('No console errors or warnings during the review checks', errors.length === 0, [...new Set(errors)].slice(0, 5).join(' | '))
console.log(results.join('\n'))
const failed = results.filter((r) => r.startsWith('FAIL')).length
console.log(`\n${results.length - failed}/${results.length} passed`)
process.exit(failed ? 1 : 0)
