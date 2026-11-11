// Checks the S5 "done when" items. Run via `npm run check` (or with `npm run preview` running: node scripts/checks/s5.mjs)
import { chromium } from 'playwright'
import { createServer } from 'vite'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const BASE = process.env.PP_BASE ?? 'http://localhost:4173/plug-and-park/'
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const JSQR = path.join(ROOT, 'node_modules', 'jsqr', 'dist', 'jsQR.js')
const results = []
const check = (name, ok, extra = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? ' - ' + extra : ''}`)
const seen = (loc, timeout = 4000) => loc.waitFor({ timeout }).then(() => true, () => false)
const IGNORE = /tile\.openstreetmap|basemaps\.cartocdn|fonts\.g|ERR_FAILED|net::/

// ── 1. Pure rules ──
{
  const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' })
  try {
    const pay = await vite.ssrLoadModule('/src/lib/payment.ts')
    const ses = await vite.ssrLoadModule('/src/lib/session.ts')
    check('luhn: 4242… and 4000…0002 pass, 4242…4241 fails', pay.luhn('4242 4242 4242 4242') && pay.luhn('4000000000000002') && !pay.luhn('4242424242424241'))
    check('cardBrand visa / mastercard (51, 2221) / unknown', pay.cardBrand('4242') === 'visa' && pay.cardBrand('5105') === 'mastercard' && pay.cardBrand('2221 00') === 'mastercard' && pay.cardBrand('3782') === 'unknown')
    check('formatCardNumber groups of 4', pay.formatCardNumber('4242424242424242') === '4242 4242 4242 4242')
    check('validateCardNumber: 12 digits / bad Luhn rejected', pay.validateCardNumber('424242424242') === 'Enter a valid card number' && pay.validateCardNumber('4242 4242 4242 4241') === 'Enter a valid card number' && pay.validateCardNumber('4242 4242 4242 4242') === null)
    const now = new Date(2026, 10, 11)
    check('validateExpiry: 13/30 invalid, 10/26 expired, 11/26 ok, 12/28 ok', pay.validateExpiry('13/30', now) === 'Enter a valid expiry date' && pay.validateExpiry('10/26', now) === 'This card has expired' && pay.validateExpiry('11/26', now) === null && pay.validateExpiry('12/28', now) === null)
    check('validateCvc: 12 → error, 123 ok', pay.validateCvc('12') === 'Enter the 3-digit security code' && pay.validateCvc('123') === null)
    check('validateCardName', pay.validateCardName('A') === 'Enter the name on the card' && pay.validateCardName('Chan') === null)
    const g1 = await pay.mockGateway('4000 0000 0000 0002', 10)
    const g2 = await pay.mockGateway('4242 4242 4242 4242', 10)
    check('mockGateway declines 4000…0002, approves 4242', !g1.ok && g1.reason === 'Your card was declined. Try another card.' && g2.ok)
    const b = { startedAt: new Date(0).toISOString(), durationMinutes: 60 }
    const half = ses.sessionState(b, { powerKw: 50 }, 12_500)
    check('sessionState halfway: progress .5, 19.5 kWh of 39 (battery-capped), 30 min left', half.progress === 0.5 && half.energyKwh === 19.5 && half.totalKwh === 39 && half.minutesLeft === 30, JSON.stringify(half))
    const ac = ses.sessionState(b, { powerKw: 7.4 }, 12_500)
    check('sessionState AC 7.4 kW 1 h: 3.7 of 7.4 kWh, battery not capped', ac.totalKwh === 7.4 && ac.energyKwh === 3.7 && ac.batteryPct === 41, JSON.stringify(ac))
    check('sessionState: battery hits 100% only at the end', ses.sessionState(b, { powerKw: 50 }, 20_000).batteryPct < 100 && ses.sessionState(b, { powerKw: 50 }, 25_000).batteryPct === 100)
    check('sessionState battery from 35%, capped at 100', ses.sessionState(b, { powerKw: 50 }, 0).batteryPct === 35 && ses.sessionState(b, { powerKw: 50 }, 25_000).batteryPct === 100)
    check('nextRating weighted average', ses.nextRating(4.8, 54, 5).rating === 4.8 && ses.nextRating(4.8, 54, 5).reviewsCount === 55 && ses.nextRating(4, 1, 5).rating === 4.5)
  } finally {
    await vite.close()
  }
}

// ── Browser helpers ──
const browser = await chromium.launch()
const errors = []
async function newTab(ctx, user) {
  const p = await ctx.newPage()
  p.on('pageerror', (e) => errors.push(e.message))
  p.on('console', (m) => m.type() === 'error' && !IGNORE.test(m.text()) && errors.push(m.text()))
  await p.addInitScript((uid) => {
    try {
      sessionStorage.getItem('pp.session.main') || sessionStorage.setItem('pp.session.main', uid)
    } catch {}
  }, user)
  return p
}
/** Inserts a booking for the demo driver straight into the stored DB (other tabs get it via the storage event). */
async function addBooking(p, patch) {
  return p.evaluate((patch) => {
    const db = JSON.parse(localStorage.getItem('pp.db'))
    const start = new Date()
    start.setDate(start.getDate() + 1)
    start.setHours(13, 0, 0, 0)
    const id = 'bk_t' + Math.random().toString(36).slice(2, 7)
    const now = new Date().toISOString()
    db.bookings.push({ id, spotId: 'sp_kwuntong_1', driverId: 'u_driver_demo', ownerId: 'u_owner_demo', start: start.toISOString(), durationMinutes: 60, price: 30, commissionRate: 0.18, status: 'confirmed', createdAt: now, updatedAt: now, ...patch })
    localStorage.setItem('pp.db', JSON.stringify(db))
    return id
  }, patch)
}
const getBooking = (p, id) => p.evaluate((id) => JSON.parse(localStorage.getItem('pp.db')).bookings.find((b) => b.id === id), id)
const label = (p, l) => p.getByLabel(l, { exact: true })

// ── 2. Pay → QR/PIN → start → progress → complete → review ──
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const owner = await newTab(ctx, 'u_owner_demo')
  await owner.goto(BASE + '#/owner')
  const p = await newTab(ctx, 'u_driver_demo')
  await p.goto(BASE + '#/app/bookings')
  const id = await addBooking(p, {})
  await p.goto(BASE + `#/app/booking/${id}`)
  await p.reload()
  await p.getByRole('button', { name: 'Pay HK$30' }).click()
  await p.waitForURL(new RegExp(`#/app/pay/${id}$`))
  check('Payment screen: summary + escrow line', (await seen(p.getByText('Charging bay'))) && (await seen(p.getByText(/released to the owner after your session/))))

  // Validation errors
  await label(p, 'Card number').fill('1234 5678 9012 3456')
  await label(p, 'Expiry').fill('0120')
  await label(p, 'CVC').fill('12')
  await p.getByRole('button', { name: 'Pay HK$30' }).click({ force: true })
  check('Invalid number → "Enter a valid card number"', await seen(p.getByText('Enter a valid card number')))
  check('Past expiry → "This card has expired"', await seen(p.getByText('This card has expired')))
  check('2-digit CVC → "Enter the 3-digit security code"', await seen(p.getByText('Enter the 3-digit security code')))
  check('Empty name → "Enter the name on the card"', await seen(p.getByText('Enter the name on the card')))
  check('Expiry auto-inserts the slash', (await label(p, 'Expiry').inputValue()) === '01/20')
  await label(p, 'Expiry').fill('1330')
  check('Month 13 → "Enter a valid expiry date"', await seen(p.getByText('Enter a valid expiry date')))

  // Decline (No branch)
  await p.getByRole('button', { name: 'Use test card' }).click()
  await label(p, 'Card number').fill('4000000000000002')
  check('Card number auto-spaced + brand label', (await label(p, 'Card number').inputValue()) === '4000 0000 0000 0002' && (await seen(p.getByText('VISA'))))
  await p.getByRole('button', { name: 'Pay HK$30' }).click()
  check('Processing… state', await seen(p.getByText('Processing…'), 1000))
  check('4000…0002 → declined banner', await seen(p.getByText('Your card was declined. Try another card.'), 4000))
  check('Declined: number/expiry/CVC cleared, name kept', (await label(p, 'Card number').inputValue()) === '' && (await label(p, 'Expiry').inputValue()) === '' && (await label(p, 'CVC').inputValue()) === '' && (await label(p, 'Name on card').inputValue()) === 'Chan Tai Man')
  check('Declined: booking stays confirmed (payable)', (await getBooking(p, id)).status === 'confirmed')

  // Success
  await p.getByRole('button', { name: 'Use test card' }).click()
  await p.getByRole('button', { name: 'Pay HK$30' }).click()
  await p.waitForURL(new RegExp(`#/app/confirm/${id}$`), { timeout: 6000 })
  const paid = await getBooking(p, id)
  check('Paid: status, last4 4242, PIN 7350, qrPayload, paidAt', paid.status === 'paid' && paid.paymentLast4 === '4242' && paid.pin === '7350' && paid.qrPayload === `PLUGPARK|${id}|7350` && !!paid.paidAt)
  check('Confirmation: "You\'re booked!", PIN and instructions', (await seen(p.getByText("You're booked!"))) && (await seen(p.getByLabel('PIN 7 3 5 0'))) && (await seen(p.getByText(/bay B-14/))))
  check('Open in Maps link (OSM, new tab)', (await p.getByRole('link', { name: 'Open in Maps' }).getAttribute('href')).startsWith('https://www.openstreetmap.org/?mlat=22.311&mlon=114.221') && (await p.getByRole('link', { name: 'Open in Maps' }).getAttribute('target')) === '_blank')

  // Nothing card-like is stored anywhere
  const stored = await p.evaluate(() => JSON.stringify({ ...localStorage }) + JSON.stringify({ ...sessionStorage }))
  const testExp = await p.evaluate(() => {
    const n = new Date()
    return `${String(n.getMonth() + 1).padStart(2, '0')}/${String((n.getFullYear() + 2) % 100).padStart(2, '0')}`
  })
  check('No full card number / expiry / CVC field in storage', !/4242\s?4242\s?4242\s?4242|4000\s?0000\s?0000\s?0002/.test(stored) && !stored.includes(testExp) && !/"(cvc|cvv|expiry|cardNumber)"/i.test(stored))

  // QR decodes to the payload (jsQR on the rendered SVG)
  await p.addScriptTag({ path: JSQR })
  const decoded = await p.evaluate(async () => {
    const svg = document.querySelector('svg.qr')
    const xml = new XMLSerializer().serializeToString(svg)
    const img = new Image()
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml)
    await img.decode()
    const c = document.createElement('canvas')
    c.width = c.height = 400
    const g = c.getContext('2d')
    g.imageSmoothingEnabled = false
    g.drawImage(img, 0, 0, 400, 400)
    const d = g.getImageData(0, 0, 400, 400)
    return window.jsQR(d.data, 400, 400)?.data ?? null
  })
  check('QR decodes to PLUGPARK|<id>|<pin>', decoded === `PLUGPARK|${id}|7350`, String(decoded))

  // Back never returns to the payment form
  await p.goBack()
  await p.waitForTimeout(500)
  check('Back after paying does not show the card form', !p.url().includes('/pay/') && (await p.getByLabel('Card number', { exact: true }).count()) === 0, p.url())
  await p.goto(BASE + `#/app/pay/${id}`)
  await p.waitForTimeout(500)
  check('Opening #/app/pay after paying redirects away', !p.url().includes('/pay/'), p.url())

  // Start charging
  await p.goto(BASE + `#/app/confirm/${id}`)
  await p.getByRole('button', { name: /start charging/ }).click()
  check('"Verifying access…" state', await seen(p.getByText('Verifying access…'), 800))
  await p.waitForURL(new RegExp(`#/app/session/${id}$`), { timeout: 4000 })
  const act = await getBooking(p, id)
  check('Started: status active + startedAt', act.status === 'active' && !!act.startedAt)
  check('Owner sees "Charging now" live', await seen(owner.getByText('Charging now'), 3000))
  await p.goto(BASE + `#/app/confirm/${id}`)
  await p.waitForTimeout(400)
  check("Can't start twice (confirm → session)", p.url().endsWith(`/app/session/${id}`) && (await getBooking(p, id)).startedAt === act.startedAt)

  // Progress continues across a reload
  await p.waitForTimeout(5000)
  const pr1 = +(await p.locator('.ring-wrap').getAttribute('data-progress'))
  await p.reload()
  await p.locator('.ring-wrap').waitFor()
  const pr2 = +(await p.locator('.ring-wrap').getAttribute('data-progress'))
  check('Session continues after reload (progress not reset)', pr1 > 0.1 && pr2 >= pr1, `${pr1} → ${pr2}`)
  check('Live tiles: energy, time left, power, cost', (await seen(p.getByText('Energy delivered'))) && (await seen(p.getByText(/min left/))) && (await seen(p.getByText(/kW$/).first())) && (await seen(p.getByText('HK$30').first())))

  // Completes by itself at the end of the demo time
  check('Completes after ~25 s → "Session complete"', await seen(p.getByText('Session complete'), 30000))
  const comp = await getBooking(p, id)
  check('Completed: energyKwh (39, battery full) + completedAt', comp.status === 'completed' && comp.energyKwh === 39 && !!comp.completedAt, JSON.stringify({ e: comp.energyKwh }))
  check('Summary shows card ending 4242', await seen(p.getByText('•••• 4242')))

  // Rate
  await p.getByRole('button', { name: 'Rate your experience' }).click()
  await p.waitForURL(new RegExp(`#/app/rate/${id}$`))
  await p.getByRole('button', { name: 'Submit review' }).click({ force: true })
  check('Rate: stars required', await seen(p.getByText('Tap the stars to rate your charge')))
  await p.getByRole('radio', { name: '5 stars' }).click()
  await p.getByRole('button', { name: 'Fast charging' }).click()
  await p.getByRole('button', { name: 'Easy to find' }).click()
  await p.getByLabel('Tell other drivers more (optional)').fill('Check review: super quick top-up.')
  check('Text counter', await seen(p.getByText('33/300')))
  await p.getByRole('button', { name: 'Submit review' }).click()
  check('Thank-you state', await seen(p.getByText('Thanks for your review!')))
  const after = await p.evaluate(() => {
    const db = JSON.parse(localStorage.getItem('pp.db'))
    return { spot: db.spots.find((s) => s.id === 'sp_kwuntong_1'), review: db.reviews[0] }
  })
  check("Spot rating + count updated (4.8 · 54 → 4.8 · 55)", after.spot.reviewsCount === 55 && after.spot.rating === 4.8)
  check('Review stored with tags', after.review.rating === 5 && after.review.tags.includes('Fast charging') && after.review.bookingId === id)
  check('Booking marked reviewed', (await getBooking(p, id)).reviewed === true)
  await p.goto(BASE + '#/app/spot/sp_kwuntong_1')
  check('New review appears first on spot details', (await p.locator('.review-list li').first().textContent()).includes('super quick top-up'))
  check('Details show 55 reviews', await seen(p.getByRole('button', { name: /55 reviews/ })))
  await ctx.close()
}

// ── 3. Bookings list: every status → right badge + action; segments + empty states ──
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const p = await newTab(ctx, 'u_driver_demo')
  await p.goto(BASE + '#/app/bookings')
  check('Upcoming empty state', await seen(p.getByText('No bookings yet')))
  const cases = [
    ['pending', {}, 'Waiting for owner', 'View request'],
    ['confirmed', {}, 'Approved — pay now', 'Pay now'],
    ['paid', { paymentLast4: '4242', pin: '7350', qrPayload: 'x' }, 'Paid', 'View access'],
    ['active', { startedAt: new Date().toISOString() }, 'Charging now', 'Resume session'],
    ['completed', { reviewed: false, energyKwh: 10 }, 'Completed', 'Rate'],
    ['declined', { declineReason: 'Other' }, 'Declined', 'Book again'],
    ['cancelled', {}, 'Cancelled', 'Book again'],
  ]
  const ids = {}
  for (const [status, extra] of cases) ids[status] = await addBooking(p, { status, ...extra })
  await p.reload()
  for (const [status, , badge, action] of cases) {
    const past = ['completed', 'declined', 'cancelled'].includes(status)
    await p.getByRole('tab', { name: past ? 'Past' : 'Upcoming' }).click()
    const card = p.locator(`.booking-card[data-booking="${ids[status]}"]`)
    const ok = (await seen(card, 2000)) && (await card.locator('.badge').textContent()) === badge && (await card.getByRole('button', { name: action, exact: true }).count()) === 1
    check(`Bookings ${past ? 'Past' : 'Upcoming'}: ${status} → "${badge}" + "${action}"`, ok)
  }
  // Seeded completed+reviewed booking (bk_hist_3) → Book again
  check('Past: reviewed completed → "Book again"', (await p.locator('.booking-card[data-booking="bk_hist_3"]').getByRole('button', { name: 'Book again' }).count()) === 1)
  // Actions go to the right screens
  await p.getByRole('tab', { name: 'Upcoming' }).click()
  await p.locator(`.booking-card[data-booking="${ids.paid}"]`).getByRole('button', { name: 'View access' }).click()
  check('"View access" → confirmation', await seen(p.getByText("You're booked!")))
  await p.goto(BASE + '#/app/bookings')
  await p.locator(`.booking-card[data-booking="${ids.active}"]`).getByRole('button', { name: 'Resume session' }).click()
  check('"Resume session" → session screen', await seen(p.locator('.ring-wrap')))
  // Demo sheet: skip charging to the end
  await p.getByRole('button', { name: /Demo only/ }).click()
  await p.getByRole('button', { name: 'Skip charging to the end' }).click()
  check('Demo sheet "Skip charging to the end" completes the session', await seen(p.getByText('Session complete'), 3000))
  await ctx.close()

  const c2 = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const q = await newTab(c2, 'u_driver_2')
  await q.goto(BASE + '#/app/bookings')
  await q.evaluate(() => {
    const db = JSON.parse(localStorage.getItem('pp.db'))
    db.bookings = db.bookings.filter((b) => b.driverId !== 'u_driver_2')
    localStorage.setItem('pp.db', JSON.stringify(db))
  })
  await q.reload()
  await q.getByRole('tab', { name: 'Past' }).click()
  check('Past empty state', await seen(q.getByText('No past bookings')))
  await c2.close()
}

await browser.close()
if (errors.length) results.push('FAIL  console/page errors: ' + [...new Set(errors)].join(' | '))
console.log(results.join('\n'))
console.log(`\n${results.filter((r) => r.startsWith('PASS')).length}/${results.length} passed`)
process.exit(results.some((r) => r.startsWith('FAIL')) ? 1 : 0)
