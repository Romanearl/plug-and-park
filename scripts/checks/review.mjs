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

// CR-05 — the map's "OpenStreetMap" credit opened in the same window; in the presenter view that replaced a phone with a page that can't load in a frame.
{
  const ctx = await browser.newContext(PHONE)
  const p = await page(ctx, 'u_driver_demo')
  await p.goto(BASE + '#/app')
  const a = p.locator('.map-attribution a')
  await a.waitFor()
  check('CR-05 the map credit link opens in a new tab (target=_blank, rel=noopener noreferrer)', (await a.getAttribute('target')) === '_blank' && /noopener/.test((await a.getAttribute('rel')) ?? '') && /noreferrer/.test((await a.getAttribute('rel')) ?? ''))
  const ext = await p.evaluate(() => [...document.querySelectorAll('a[href^="http"]')].filter((x) => x.target !== '_blank' || !/noopener/.test(x.rel)).length)
  check('CR-05 no external link on the map screen opens in the app window', ext === 0, `${ext}`)
  await ctx.close()
}

// CR-06 — an open sheet pulled the focus back to its first control whenever the screen behind it re-rendered
// (e.g. the other phone saved something while the owner was typing an FPS ID).
{
  const ctx = await browser.newContext(PHONE)
  const o = await page(ctx, 'u_owner_demo')
  const other = await page(ctx, 'u_owner_demo')
  await o.goto(BASE + '#/owner/earnings')
  await other.goto(BASE + '#/owner/spots')
  await other.locator('.owner-spot[data-spot="sp_shatin_1"]').waitFor()
  await o.getByRole('button', { name: 'Withdraw', exact: true }).click()
  const fps = o.getByLabel('FPS ID (mobile or email)')
  await fps.click()
  await fps.fill('6123')
  await other.locator('.owner-spot[data-spot="sp_shatin_1"] .switch').click() // a change from the other window
  await o.waitForTimeout(400)
  await o.keyboard.type('4567')
  check('CR-06 typing in an open sheet keeps the focus while another window saves', (await fps.inputValue()) === '61234567' && (await fps.evaluate((el) => el === document.activeElement)), await fps.inputValue())
  await o.keyboard.press('Escape')
  check('CR-06 Escape still closes the sheet', !(await o.getByRole('dialog').isVisible()))
  await o.goto(BASE + '#/owner')
  await o.getByRole('button', { name: 'Decline' }).first().click()
  await o.waitForTimeout(200) // the sheet focuses its first control when it opens
  await o.getByRole('button', { name: 'Charger under maintenance' }).focus()
  await other.locator('.owner-spot[data-spot="sp_shatin_1"] .switch').click()
  await o.waitForTimeout(400)
  check('CR-06 the Decline sheet keeps the focused reason while another window saves', await o.getByRole('button', { name: 'Charger under maintenance' }).evaluate((el) => el === document.activeElement))
  await ctx.close()
}

// CR-07 — in development mode (`npm run dev`) the payment never finished: "Processing…" stayed forever.
// Needs the dev server, so this block starts one for a moment.
{
  const { createServer } = await import('vite')
  const server = await createServer({ logLevel: 'silent', server: { port: 5197, strictPort: false } })
  await server.listen()
  const DEV = `${server.resolvedUrls.local[0]}`
  const ctx = await browser.newContext(PHONE)
  const p = await ctx.newPage() // dev-mode console noise (React DevTools hint) is not collected
  const devErrors = []
  p.on('pageerror', (e) => devErrors.push(e.message))
  await p.goto(DEV + '#/', { timeout: 60000 })
  await p.getByText('Charge where').waitFor({ timeout: 60000 })
  await p.evaluate(() => sessionStorage.setItem('pp.session.main', 'u_driver_demo'))
  await addBooking(p, 'bk_cr07', 'confirmed')
  await p.goto('about:blank')
  await p.goto(DEV + '#/app/pay/bk_cr07')
  await p.getByRole('button', { name: 'Use test card' }).click()
  await p.getByRole('button', { name: /^Pay HK\$/ }).click()
  check('CR-07 dev mode: paying reaches the QR + PIN screen', (await seen(p.locator('svg.qr'), 10000)) && devErrors.length === 0, devErrors.join(' | '))
  await ctx.close()
  await server.close()
}

// CR-08 — after the browser's own Back button, the in-app back arrow could leave the app.
{
  const ctx = await browser.newContext(PHONE)
  const p = await page(ctx)
  await p.goto(BASE + '#/login') // opened directly: nothing of the app is behind this screen
  await p.getByRole('button', { name: /Demo driver/ }).click()
  await p.getByRole('button', { name: 'Log in' }).click()
  await p.getByLabel('Digit 1 of 6').waitFor()
  await p.goBack()
  await p.getByRole('button', { name: /Demo driver/ }).waitFor()
  await p.getByRole('button', { name: 'Back' }).first().click()
  check('CR-08 browser Back, then the in-app back arrow: stays in the app (landing page)', (await seen(p.getByText('Charge where'), 3000)) && p.url().startsWith(BASE), p.url())
  await ctx.close()
  const ctx2 = await browser.newContext(PHONE)
  const q = await page(ctx2, 'u_driver_demo')
  await q.goto(BASE + '#/app')
  await q.locator('.spot-card[data-spot="sp_kwuntong_1"]').click()
  await q.getByRole('button', { name: 'View details' }).click()
  await q.locator('.carousel').waitFor()
  await q.reload()
  await q.locator('.carousel').waitFor()
  await q.getByRole('button', { name: 'Back' }).first().click()
  check('CR-08 after a reload on the details screen, the back arrow returns to the map', (await seen(q.locator('.map-home'), 4000)) && /#\/app$/.test(q.url()), q.url())
  await q.goForward()
  check('CR-08 …and browser Forward brings the details back', await seen(q.locator('.carousel'), 4000))
  await ctx2.close()
}

// CR-09 — a name, title or address typed as one very long word ran off the right edge of the screen.
{
  const ctx = await browser.newContext(PHONE)
  const p = await page(ctx, 'u_driver_demo')
  await p.goto(BASE + '#/app/bookings')
  await p.locator('.booking-card, .empty-state').first().waitFor()
  await addBooking(p, 'bk_cr09', 'pending')
  await p.evaluate(() => {
    const d = JSON.parse(localStorage.getItem('pp.db'))
    const sp = d.spots.find((s) => s.id === 'sp_kwuntong_1')
    sp.title = 'W'.repeat(60) // the application form allows 60
    sp.address = 'M'.repeat(120)
    sp.instructions = 'i'.repeat(200)
    for (const id of ['u_owner_demo', 'u_driver_demo', 'u_driver_3']) d.users.find((u) => u.id === id).name = 'W'.repeat(40) // registration allows 40
    d.reviews.unshift({ id: 'rv_cr09', bookingId: '', spotId: 'sp_kwuntong_1', driverId: 'u_driver_3', rating: 5, text: 'x'.repeat(300), createdAt: new Date().toISOString() })
    localStorage.setItem('pp.db', JSON.stringify(d))
  })
  // Text that sticks out past the right edge of the phone (scrolling strips and the map are left out).
  const cut = (pg) =>
    pg.evaluate(() =>
      [...document.querySelectorAll('.app-body *')]
        .filter((el) => !el.closest('.leaflet-container, .carousel, .chip-row, .chip-scroll, svg') && el.children.length === 0 && el.textContent.trim() && el.getBoundingClientRect().right > innerWidth + 1)
        .map((el) => `${el.tagName.toLowerCase()}.${el.className}`)
        .slice(0, 4)
        .join(', '),
    )
  const bad = []
  const visit = async (pg, routes) => {
    for (const r of routes) {
      await pg.goto('about:blank')
      await pg.goto(BASE + r)
      await pg.waitForTimeout(450)
      const c = await cut(pg)
      if (c) bad.push(`${r}: ${c}`)
    }
  }
  await visit(p, ['#/app/spot/sp_kwuntong_1', '#/app/bookings', '#/app/booking/bk_cr09', '#/app/account'])
  await p.evaluate(() => sessionStorage.setItem('pp.session.main', 'u_owner_demo'))
  await visit(p, ['#/owner', '#/owner/earnings', '#/owner/spots', '#/owner/spots/sp_kwuntong_1', '#/owner/account'])
  check('CR-09 60-character titles and 40-character names without spaces wrap inside the screen (9 screens)', bad.length === 0, bad.join(' | '))
  await ctx.close()
}

// CR-10 — "Signing you in…" stayed forever when the account had disappeared (demo reset in another window).
{
  const ctx = await browser.newContext(PHONE)
  const p = await ctx.newPage()
  const mine = []
  p.on('pageerror', (e) => mine.push(e.message))
  await p.goto(BASE + '#/')
  await p.evaluate(() => sessionStorage.setItem('pp.pending.main', JSON.stringify({ kind: 'login', userId: 'u_gone' })))
  await p.goto('about:blank')
  await p.goto(BASE + '#/verify')
  await p.getByLabel('Digit 1 of 6').waitFor()
  await p.keyboard.type('123456')
  check('CR-10 verifying a login whose account is gone returns to Log in (no crash, no endless "Signing you in…")', (await seen(p.getByRole('heading', { name: 'Log in' }), 4000)) && mine.length === 0, mine.join(' | '))
  await ctx.close()
}

// CR-11 — an 8-digit FPS mobile number starting with 852 was refused (the "852" was taken for the area code).
{
  const ctx = await browser.newContext(PHONE)
  const o = await page(ctx, 'u_owner_demo')
  await o.goto(BASE + '#/owner/earnings')
  await o.getByRole('button', { name: 'Withdraw', exact: true }).click()
  const fps = o.getByLabel('FPS ID (mobile or email)')
  const tryId = async (v) => {
    await fps.fill(v)
    await o.getByRole('button', { name: /^Withdraw HK\$/ }).click()
    await o.waitForTimeout(150)
    return !(await o.getByText('Enter an 8-digit HK mobile number or an email').isVisible())
  }
  const bad1 = await tryId('1234 5678')
  const bad2 = await tryId('852 1234')
  check('CR-11 wrong FPS IDs are still refused', !bad1 && !bad2)
  const ok = await tryId('8521 2345')
  check('CR-11 FPS ID "8521 2345" is accepted and the payout is sent', ok && (await seen(o.getByText(/On its way/), 3000)))
  check('CR-11 …stored masked', (await db(o)).payouts[0]?.destination === 'FPS •••• 2345', (await db(o)).payouts[0]?.destination)
  await ctx.close()
}

await browser.close()
check('No console errors or warnings during the review checks', errors.length === 0, [...new Set(errors)].slice(0, 5).join(' | '))
console.log(results.join('\n'))
const failed = results.filter((r) => r.startsWith('FAIL')).length
console.log(`\n${results.length - failed}/${results.length} passed`)
process.exit(failed ? 1 : 0)
