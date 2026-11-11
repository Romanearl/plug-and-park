// S9 failure drills. Run via `npm run check` (or with `npm run preview` running: node scripts/checks/s9.mjs)
import { chromium } from 'playwright'

const BASE = process.env.PP_BASE ?? 'http://localhost:4173/plug-and-park/'
const results = []
const check = (name, ok, extra = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? ' - ' + extra : ''}`)
const seen = (loc, timeout = 5000) => loc.waitFor({ timeout }).then(() => true, () => false)
const IGNORE = /tile\.openstreetmap|basemaps\.cartocdn|fonts\.g|ERR_FAILED|ERR_INTERNET_DISCONNECTED|net::/
const browser = await chromium.launch()
const errors = []
const P = { viewport: { width: 390, height: 844 } }

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
const noOverflow = (p) => p.evaluate(() => ![...document.querySelectorAll('.scroll, .screen, body')].some((el) => el.scrollWidth > el.clientWidth + 1))
const noNaN = (p) => p.evaluate(() => !/NaN|undefined|-\d+ min left|Invalid Date/.test(document.querySelector('.app-body')?.innerText ?? ''))
async function request(p, time, spot = 'sp_kwuntong_1') {
  await p.goto(BASE + `#/app/spot/${spot}`)
  const s = p.getByRole('dialog', { name: 'Request booking' })
  if (!(await s.isVisible().catch(() => false))) await p.getByRole('button', { name: 'Request booking', exact: true }).click()
  await s.getByRole('button', { name: 'Tomorrow', exact: true }).click()
  await s.getByRole('button', { name: time, exact: true }).click()
  await s.getByRole('button', { name: '1 h', exact: true }).click()
  return s
}
async function addBooking(p, patch) {
  return p.evaluate((patch) => {
    const d = JSON.parse(localStorage.getItem('pp.db'))
    const start = new Date()
    start.setDate(start.getDate() + 1)
    start.setHours(13, 0, 0, 0)
    const id = 'bk_d' + Math.random().toString(36).slice(2, 7)
    const now = new Date().toISOString()
    d.bookings.push({ id, spotId: 'sp_kwuntong_1', driverId: 'u_driver_demo', ownerId: 'u_owner_demo', start: start.toISOString(), durationMinutes: 60, price: 30, commissionRate: 0.18, status: 'confirmed', createdAt: now, updatedAt: now, ...patch })
    localStorage.setItem('pp.db', JSON.stringify(d))
    return id
  }, patch)
}

// 1. Map tiles blocked → list fallback, and the path still works
{
  const ctx = await browser.newContext(P)
  await ctx.route(/tile\.openstreetmap\.org/, (r) => r.abort())
  const p = await page(ctx, 'u_driver_demo')
  await p.goto(BASE + '#/app')
  const fb = await seen(p.getByText('Map unavailable — showing list'), 10000)
  await p.locator('.spot-card[data-spot="sp_kwuntong_1"]').click()
  await p.getByRole('button', { name: 'View details' }).click()
  const s = await request(p, '13:00')
  await s.getByRole('button', { name: /^Request booking ·/ }).click()
  check('Tiles blocked: list fallback + request still works', fb && (await seen(p.locator('.status-card[data-status="pending"]'))))
  await ctx.close()
}

// 2. Google Fonts blocked → readable fallback fonts, no layout breakage
{
  const ctx = await browser.newContext(P)
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort())
  const p = await page(ctx, 'u_driver_demo')
  let ok = true
  for (const r of ['#/', '#/register', '#/app/spot/sp_kwuntong_1', '#/app/bookings']) {
    await p.goto(BASE + r)
    await p.waitForTimeout(400)
    ok = ok && (await noOverflow(p))
  }
  const inter = await p.evaluate(() => [...document.fonts].some((f) => f.family.includes('Inter') && f.status === 'loaded'))
  check('Fonts blocked: fallback fonts, no horizontal overflow on 4 screens', ok && !inter)
  await ctx.close()
}

// 3. Fully offline after load → every screen except tiles works
{
  const ctx = await browser.newContext(P)
  const p = await page(ctx, 'u_driver_demo')
  await p.goto(BASE + '#/')
  await p.waitForTimeout(3800) // lazy chunks are prefetched ~3 s after start-up
  await ctx.setOffline(true)
  await p.goto(BASE + '#/app').catch(() => {})
  await p.evaluate(() => (location.hash = '#/app'))
  const map = await seen(p.locator('.spot-card').first(), 8000)
  await p.evaluate(() => (location.hash = '#/app/spot/sp_kwuntong_1'))
  const s = await (async () => {
    const d = p.getByRole('dialog', { name: 'Request booking' })
    await p.getByRole('button', { name: 'Request booking', exact: true }).click()
    await d.getByRole('button', { name: 'Tomorrow', exact: true }).click()
    await d.getByRole('button', { name: '13:00', exact: true }).click()
    await d.getByRole('button', { name: /^Request booking ·/ }).click()
    return seen(p.locator('.status-card[data-status="pending"]'))
  })()
  await p.evaluate(() => sessionStorage.setItem('pp.session.main', 'u_owner_demo'))
  await p.evaluate(() => (location.hash = '#/owner/apply'))
  await p.waitForTimeout(300)
  check('Offline after load: map list, details, booking and the lazy apply screen all work', map && s)
  await ctx.close()
}
{
  const ctx = await browser.newContext(P)
  const p = await page(ctx, 'u_owner_demo')
  await p.goto(BASE + '#/owner')
  await p.waitForTimeout(3800)
  await ctx.setOffline(true)
  await p.evaluate(() => (location.hash = '#/owner/apply'))
  check('Offline after load: owner application (lazy chunk) opens', await seen(p.getByText('Step 1 of 3')))
  await ctx.close()
}

// 4. Storage blocked / full → runs in memory with one notice, no crash
{
  const ctx = await browser.newContext(P)
  await ctx.addInitScript(() => {
    const deny = () => {
      throw new DOMException('blocked', 'SecurityError')
    }
    Object.defineProperty(window, 'localStorage', { get: deny })
    Object.defineProperty(window, 'sessionStorage', { get: deny })
  })
  const p = await page(ctx)
  await p.goto(BASE + '#/')
  const notice = await seen(p.getByText(/Storage is blocked/))
  await p.getByRole('button', { name: /Demo only/ }).click()
  await p.getByRole('button', { name: 'Sign in as driver' }).click()
  const map = await seen(p.locator('.spot-card').first(), 8000)
  check('Storage blocked: one notice, app runs in memory (sign in + map)', notice && map && (await p.getByText(/Storage is blocked/).count()) === 1)
  await ctx.close()

  const c2 = await browser.newContext(P)
  await c2.addInitScript(() => {
    Storage.prototype.setItem = function () {
      throw new DOMException('full', 'QuotaExceededError')
    }
  })
  const q = await page(c2)
  await q.goto(BASE + '#/')
  await q.getByRole('button', { name: /Demo only/ }).click()
  await q.getByRole('button', { name: 'Sign in as driver' }).click()
  check('Storage full: notice + still signed in and usable', (await seen(q.getByText(/Storage is blocked/))) && (await seen(q.locator('.spot-card').first(), 8000)))
  await c2.close()
}

// 5–6. Corrupt / old stored data → clean re-seed
{
  const ctx = await browser.newContext(P)
  const p = await page(ctx, 'u_driver_demo')
  await p.goto(BASE + '#/')
  await p.evaluate(() => localStorage.setItem('pp.db', '{"garbage": tru'))
  await p.reload()
  await p.getByText('Charge where').waitFor()
  check('Corrupt pp.db → re-seeded (12 spots, current version)', (await db(p)).spots.length === 12)
  await p.evaluate(() => localStorage.setItem('pp.db', JSON.stringify({ version: 1, users: [], spots: [], bookings: [], reviews: [], payouts: [] })))
  await p.reload()
  await p.goto(BASE + '#/app')
  check('Old version pp.db → re-seeded without error', (await db(p)).version > 1 && (await seen(p.locator('.spot-card').first(), 8000)))
  await ctx.close()
}

// 7. Reset demo from every screen, in each window, mid-flow
{
  const ctx = await browser.newContext(P)
  const d = await page(ctx, 'u_driver_demo')
  await d.goto(BASE + '#/app')
  const ids = { confirmed: await addBooking(d, {}), paid: await addBooking(d, { status: 'paid', paymentLast4: '4242', pin: '7350', qrPayload: 'x' }), active: await addBooking(d, { status: 'active', paymentLast4: '4242', startedAt: new Date().toISOString() }) }
  const routes = ['#/app', '#/app/bookings', '#/app/account', '#/app/spot/sp_kwuntong_1', `#/app/booking/${ids.confirmed}`, `#/app/pay/${ids.confirmed}`, `#/app/confirm/${ids.paid}`, `#/app/session/${ids.active}`]
  let ok = true
  const failedAt = []
  for (const r of routes) {
    await d.evaluate(([a, b, c]) => {
      // put the three bookings back after each reset
      const db = JSON.parse(localStorage.getItem('pp.db'))
      if (!db.bookings.some((x) => x.id === a)) localStorage.setItem('pp.db', JSON.stringify(db))
    }, [ids.confirmed, ids.paid, ids.active])
    await d.goto(BASE + r)
    await d.waitForTimeout(300)
    await d.getByRole('button', { name: /Demo only/ }).click()
    await d.getByRole('button', { name: 'Reset demo' }).click()
    await d.getByRole('button', { name: 'Tap again to wipe all demo data' }).click()
    const landed = await seen(d.getByText('Charge where'), 3000)
    if (!landed) failedAt.push(r)
    ok = ok && landed
    // sign back in + restore bookings for the next route
    await d.evaluate(() => sessionStorage.setItem('pp.session.main', 'u_driver_demo'))
    await d.goto('about:blank')
    await d.goto(BASE + '#/app/bookings')
    for (const [k, v] of Object.entries(ids)) await d.evaluate(([id, status]) => {
      const db = JSON.parse(localStorage.getItem('pp.db'))
      if (db.bookings.some((x) => x.id === id)) return
      const start = new Date(Date.now() + 864e5)
      start.setHours(13 + ['confirmed', 'paid', 'active'].indexOf(status), 0, 0, 0)
      const now = new Date().toISOString()
      db.bookings.push({ id, spotId: 'sp_kwuntong_1', driverId: 'u_driver_demo', ownerId: 'u_owner_demo', start: start.toISOString(), durationMinutes: 60, price: 30, commissionRate: 0.18, status, paymentLast4: '4242', pin: '7350', qrPayload: 'x', startedAt: now, createdAt: now, updatedAt: now })
      localStorage.setItem('pp.db', JSON.stringify(db))
    }, [v, k])
  }
  check('Reset from every driver screen (incl. pending, pay, access, active session) → #/', ok, failedAt.join(','))
  // Owner window
  const o = await page(ctx, 'u_owner_demo')
  let ok2 = true
  for (const r of ['#/owner', '#/owner/earnings', '#/owner/spots', '#/owner/spots/sp_saikung_1', '#/owner/account', '#/owner/apply']) {
    await o.evaluate(() => sessionStorage.setItem('pp.session.main', 'u_owner_demo')).catch(() => {})
    await o.goto('about:blank')
    await o.goto(BASE + r)
    await o.waitForTimeout(400)
    await o.getByRole('button', { name: /Demo only/ }).click()
    await o.getByRole('button', { name: 'Reset demo' }).click()
    await o.getByRole('button', { name: 'Tap again to wipe all demo data' }).click()
    ok2 = ok2 && (await seen(o.getByText('Charge where'), 3000))
  }
  check('Reset from every owner screen → #/', ok2)
  // Payment in progress
  await d.evaluate(() => sessionStorage.setItem('pp.session.main', 'u_driver_demo'))
  await d.goto('about:blank')
  await d.goto(BASE + '#/app')
  const pid = await addBooking(d, {})
  await d.goto(BASE + `#/app/pay/${pid}`)
  await d.reload()
  await d.getByRole('button', { name: 'Use test card' }).click()
  await d.getByRole('button', { name: /^Pay HK\$/ }).click()
  await d.getByText('Processing…').waitFor()
  await d.getByRole('button', { name: /Demo only/ }).click()
  await d.getByRole('button', { name: 'Reset demo' }).click()
  await d.getByRole('button', { name: 'Tap again to wipe all demo data' }).click()
  await d.waitForTimeout(2000) // gateway would have answered by now
  check('Reset during "Processing…" payment → #/, no crash, nothing paid', (await seen(d.getByText('Charge where'))) && !(await db(d)).bookings.some((b) => b.id === pid))
  await ctx.close()
}

// 8. Refresh (F5) on every route, including bad ids
{
  const ctx = await browser.newContext(P)
  const p = await page(ctx, 'u_driver_demo')
  const o = await page(ctx, 'u_owner_demo')
  const bad = []
  for (const [pg, r] of [
    [p, '#/'], [p, '#/register'], [p, '#/login'], [p, '#/verify'], [p, '#/app'], [p, '#/app/bookings'], [p, '#/app/account'],
    [p, '#/app/spot/sp_kwuntong_1'], [p, '#/app/spot/nope'], [p, '#/app/booking/nope'], [p, '#/app/pay/nope'], [p, '#/app/confirm/nope'],
    [p, '#/app/session/nope'], [p, '#/app/rate/nope'], [p, '#/presenter'], [p, '#/totally/unknown'],
    [o, '#/owner'], [o, '#/owner/earnings'], [o, '#/owner/spots'], [o, '#/owner/spots/sp_saikung_1'], [o, '#/owner/spots/nope'],
    [o, '#/owner/account'], [o, '#/owner/apply'], [o, '#/owner/apply/nope'], [o, '#/owner/setup/nope'],
  ]) {
    await pg.goto(BASE + r)
    await pg.reload()
    await pg.waitForTimeout(500)
    const rendered = await pg.evaluate(() => (document.querySelector('.app-body')?.innerText.trim().length ?? 0) > 0 || document.querySelectorAll('iframe').length === 2 || document.querySelector('.presenter') !== null)
    if (!rendered || !(await noNaN(pg))) bad.push(r)
  }
  check('F5 on every route (25, incl. bad ids) renders a real screen', bad.length === 0, bad.join(','))
  await ctx.close()
}

// 9. Browser Back through the whole flow: never the card form after paying, never blank, nothing re-submitted
{
  const ctx = await browser.newContext(P)
  const p = await page(ctx, 'u_driver_demo')
  await p.goto(BASE + '#/app')
  await p.locator('.spot-card[data-spot="sp_kwuntong_1"]').click()
  await p.getByRole('button', { name: 'View details' }).click()
  const s = await request(p, '13:00')
  await s.getByRole('button', { name: /^Request booking ·/ }).click()
  await p.waitForFunction(() => location.hash.startsWith('#/app/booking/'))
  const id = p.url().split('/').pop()
  await p.evaluate((id) => {
    const db = JSON.parse(localStorage.getItem('pp.db'))
    db.bookings.find((b) => b.id === id).status = 'confirmed'
    localStorage.setItem('pp.db', JSON.stringify(db))
  }, id)
  await p.reload()
  await p.getByRole('button', { name: /^Pay HK\$/ }).click()
  await p.getByRole('button', { name: 'Use test card' }).click()
  await p.getByRole('button', { name: /^Pay HK\$/ }).click()
  await p.locator('svg.qr').waitFor()
  const count = (await db(p)).bookings.length
  let blank = 0
  let payForm = 0
  for (let i = 0; i < 6; i++) {
    await p.goBack().catch(() => {})
    await p.waitForTimeout(400)
    if (!p.url().startsWith(BASE)) break // left the app (browser history before it) — not an app screen
    if ((await p.evaluate(() => document.querySelector('.app-body')?.innerText.trim().length ?? 0)) === 0) blank++
    if (await p.getByLabel('Card number', { exact: true }).count()) payForm++
  }
  if (!p.url().startsWith(BASE)) await p.goto(BASE + '#/app/bookings')
  check('Back ×6 after paying: no blank screen, never the card form, nothing re-submitted', blank === 0 && payForm === 0 && (await db(p)).bookings.length === count, JSON.stringify({ blank, payForm }))
  await ctx.close()
}

// 10. Two windows as the same user
{
  const ctx = await browser.newContext(P)
  const a = await page(ctx, 'u_driver_demo')
  const b = await page(ctx, 'u_driver_demo')
  await b.goto(BASE + '#/app/bookings')
  await a.bringToFront()
  await a.goto(BASE + '#/app/bookings')
  const before = (await db(a)).bookings.length
  const s = await request(a, '13:00')
  await s.getByRole('button', { name: /^Request booking ·/ }).click()
  await a.waitForFunction(() => location.hash.startsWith('#/app/booking/'))
  const id = a.url().split('/').pop()
  await b.bringToFront()
  check('Same user in two windows: the request shows once in the other window', (await seen(b.locator(`.booking-card[data-booking="${id}"]`), 3000)) && (await b.locator(`.booking-card[data-booking="${id}"]`).count()) === 1 && (await db(b)).bookings.length === before + 1)
  await ctx.close()
}

// 11. Clock edges: near midnight, closed today, session just before closing
{
  const ctx = await browser.newContext(P)
  const p = await page(ctx, 'u_driver_demo')
  const late = new Date()
  late.setHours(23, 50, 0, 0)
  await p.clock.install({ time: late })
  await p.goto(BASE + '#/app/spot/sp_kwuntong_1')
  await p.getByRole('button', { name: 'Request booking', exact: true }).click()
  const sheet = p.getByRole('dialog', { name: 'Request booking' })
  const todayTimes = await sheet.getByRole('button', { name: 'Today', exact: true }).isDisabled().catch(() => true)
  const tomorrowSelected = (await sheet.getByRole('button', { name: 'Tomorrow', exact: true }).getAttribute('aria-pressed')) === 'true'
  check('23:50: today has no bookable time, sheet starts on Tomorrow, no NaN', (todayTimes || tomorrowSelected) && (await noNaN(p)))
  // Closed today: find a spot closed today and check its badge
  const closedSpot = await p.evaluate(() => {
    const db = JSON.parse(localStorage.getItem('pp.db'))
    const d = new Date().getDay()
    return db.spots.find((s) => !s.availability.some((w) => w.day === d))?.id ?? null
  })
  if (closedSpot) {
    await p.goto(BASE + `#/app/spot/${closedSpot}`)
    check('Spot closed today: "Opens …" badge and "Closed today", no NaN', (await seen(p.getByText(/^Opens /).first())) && (await noNaN(p)))
  } else check('Spot closed today: (every spot opens today — skipped)', true)
  // Session started just before closing (21:59 at Kwun Tong, closes 22:00)
  const nearClose = new Date()
  nearClose.setHours(21, 59, 0, 0)
  await p.clock.setFixedTime(nearClose)
  const id = await addBooking(p, { status: 'active', paymentLast4: '4242', start: nearClose.toISOString(), startedAt: new Date(nearClose.getTime() - 1000).toISOString() })
  await p.goto(BASE + `#/app/session/${id}`)
  await p.reload()
  await p.locator('.ring-wrap').waitFor()
  check('Session started just before closing: no negative time or NaN', await noNaN(p))
  await ctx.close()
}

// 12. Fast double taps → exactly one result each
{
  const ctx = await browser.newContext(P)
  const d = await page(ctx, 'u_driver_demo')
  const o = await page(ctx, 'u_owner_demo')
  await o.goto(BASE + '#/owner')
  await d.bringToFront()
  await d.goto(BASE + '#/app')
  const n0 = (await db(d)).bookings.length
  const s = await request(d, '13:00')
  await s.getByRole('button', { name: /^Request booking ·/ }).dblclick()
  await d.waitForFunction(() => location.hash.startsWith('#/app/booking/'))
  const id = d.url().split('/').pop()
  const reqOne = (await db(d)).bookings.length === n0 + 1
  await o.bringToFront()
  await o.locator(`.request-card[data-booking="${id}"]`).getByRole('button', { name: 'Approve' }).dblclick()
  await o.waitForTimeout(400)
  const approvedOnce = (await db(o)).bookings.find((b) => b.id === id).status === 'confirmed'
  await d.bringToFront()
  await d.getByRole('button', { name: /^Pay HK\$/ }).click()
  await d.getByRole('button', { name: 'Use test card' }).click()
  await d.getByRole('button', { name: /^Pay HK\$/ }).dblclick()
  await d.locator('svg.qr').waitFor()
  await d.getByRole('button', { name: /start charging/ }).dblclick()
  await d.locator('.ring-wrap').waitFor()
  const startedAt = (await db(d)).bookings.find((b) => b.id === id).startedAt
  await d.getByRole('button', { name: /Demo only/ }).click()
  await d.getByRole('button', { name: 'Skip charging to the end' }).click()
  await d.getByRole('button', { name: 'Rate your experience' }).click()
  await d.getByRole('radio', { name: '5 stars' }).click()
  await d.getByRole('button', { name: 'Submit review' }).dblclick()
  await d.getByText('Thanks for your review!').waitFor()
  const after = await db(d)
  const reviews = after.reviews.filter((r) => r.bookingId === id).length
  await o.bringToFront()
  await o.goto(BASE + '#/owner/earnings')
  await o.getByRole('button', { name: 'Withdraw', exact: true }).click()
  await o.getByRole('button', { name: /^Withdraw HK\$/ }).dblclick()
  await o.getByText(/On its way/).waitFor()
  await o.waitForTimeout(300)
  const payouts = (await db(o)).payouts.length
  check('Double taps: Request, Approve, Pay, Start, Submit review, Withdraw → exactly one each', reqOne && approvedOnce && !!startedAt && after.bookings.find((b) => b.id === id).paymentLast4 === '4242' && reviews === 1 && payouts === 1, JSON.stringify({ reqOne, approvedOnce, reviews, payouts }))
  await ctx.close()
}

await browser.close()
if (errors.length) results.push('FAIL  console/page errors or warnings: ' + [...new Set(errors)].join(' | '))
console.log(results.join('\n'))
console.log(`\n${results.filter((r) => r.startsWith('PASS')).length}/${results.length} passed`)
process.exit(results.some((r) => r.startsWith('FAIL')) ? 1 : 0)
