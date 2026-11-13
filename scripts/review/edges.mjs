// Code-review edge-case drills (CODE_REVIEW_TASK phase 3). Exploration, not part of `npm run check`:
// the regression checks for what these found live in scripts/checks/review.mjs.
//   node scripts/review/edges.mjs [section …]      sections: tz clock nav hostile storage net sizes taps tabs leak
// Needs a running preview (PP_BASE, default http://localhost:4173/plug-and-park/).

import playwright from 'playwright'

const BASE = process.env.PP_BASE ?? 'http://localhost:4173/plug-and-park/'
const only = process.argv.slice(2)
const want = (s) => only.length === 0 || only.includes(s)
const IGNORE = /tile\.openstreetmap|fonts\.g|ERR_FAILED|ERR_INTERNET_DISCONNECTED|net::/
const results = []
const check = (name, ok, extra = '') => {
  results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? ' - ' + extra : ''}`)
  console.log(results[results.length - 1])
}
const seen = (loc, timeout = 5000) => loc.waitFor({ timeout }).then(() => true, () => false)
const PHONE = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }
const chromium = await playwright.chromium.launch()

function watch(p, errors) {
  p.on('pageerror', (e) => errors.push(`page error: ${e.message}`))
  p.on('console', (m) => (m.type() === 'error' || m.type() === 'warning') && !IGNORE.test(m.text()) && errors.push(`${m.type()}: ${m.text()}`))
  p.on('dialog', (d) => {
    errors.push(`native dialog: ${d.message()}`)
    void d.dismiss()
  })
}
async function open(ctx, user, errors, name = 'main') {
  const p = await ctx.newPage()
  watch(p, errors)
  if (user)
    await p.addInitScript(
      ([u, n]) => {
        try {
          if (window.name === '' || window.name === n) sessionStorage.getItem('pp.session.' + n) || sessionStorage.setItem('pp.session.' + n, u)
        } catch {}
      },
      [user, name],
    )
  return p
}
const db = (p) => p.evaluate(() => JSON.parse(localStorage.getItem('pp.db')))
const patchDB = (p, fn, arg) =>
  p.evaluate(
    ([src, arg]) => {
      const d = JSON.parse(localStorage.getItem('pp.db'))
      // eslint-disable-next-line no-new-func
      new Function('d', 'arg', `(${src})(d, arg)`)(d, arg)
      localStorage.setItem('pp.db', JSON.stringify(d))
    },
    [fn.toString(), arg],
  )
const overflow = (p) =>
  p.evaluate(() =>
    [...document.querySelectorAll('.scroll, .screen, body, .sheet-body')]
      .filter((el) => el.scrollWidth > el.clientWidth + 1)
      .map((el) => el.className || el.tagName)
      .join(','),
  )
const badText = (p) => p.evaluate(() => (/NaN|undefined|Invalid Date|\[object Object\]|-\d+ min left/.exec(document.querySelector('.app-body')?.innerText ?? '') ?? [''])[0])
const blank = (p) => p.evaluate(() => (document.querySelector('.app-body')?.innerText ?? document.body.innerText).trim().length === 0 && !document.querySelector('.leaflet-container, .skeleton'))
async function bookingSheet(p, spot = 'sp_kwuntong_1') {
  await p.goto(BASE + `#/app/spot/${spot}`)
  const s = p.getByRole('dialog', { name: 'Request booking' })
  if (!(await s.isVisible().catch(() => false))) await p.getByRole('button', { name: 'Request booking', exact: true }).click()
  await s.waitFor()
  return s
}
const slotCheck = (p) => p.locator('[data-slot-check]').getAttribute('data-slot-check')

// ── Time zones: the rule is "the device's local time" everywhere ─────────────────────────────
if (want('tz')) {
  for (const tz of ['Asia/Hong_Kong', 'Europe/Moscow', 'America/Los_Angeles']) {
    const errors = []
    const ctx = await chromium.newContext({ ...PHONE, timezoneId: tz })
    const p = await open(ctx, 'u_driver_demo', errors)
    const s = await bookingSheet(p)
    const local = await p.evaluate(() => {
      const d = JSON.parse(localStorage.getItem('pp.db'))
      const b = d.bookings.find((x) => x.id === 'bk_block_1')
      const st = new Date(b.start)
      const tm = new Date()
      tm.setDate(tm.getDate() + 1)
      const n = new Date()
      const mins = n.getHours() * 60 + n.getMinutes()
      return { hhmm: `${st.getHours()}:${String(st.getMinutes()).padStart(2, '0')}`, tomorrow: st.toDateString() === tm.toDateString(), openNow: mins >= 7 * 60 && mins < 22 * 60, tz: Intl.DateTimeFormat().resolvedOptions().timeZone }
    })
    check(`[${tz}] browser runs in that zone`, local.tz === tz, local.tz)
    check(`[${tz}] seeded blocked slot is tomorrow 10:00 local`, local.hhmm === '10:00' && local.tomorrow, JSON.stringify(local))
    await s.getByRole('button', { name: 'Tomorrow', exact: true }).click()
    await s.getByRole('button', { name: '10:00', exact: true }).click()
    await s.getByRole('button', { name: '1 h', exact: true }).click()
    check(`[${tz}] tomorrow 10:00 is taken`, (await slotCheck(p)) === 'taken', await slotCheck(p))
    await s.getByRole('button', { name: '12:00', exact: true }).click()
    check(`[${tz}] tomorrow 12:00 is free`, (await slotCheck(p)) === 'ok')
    await s.getByRole('button', { name: 'Close' }).click()
    const badge = (await p.locator('.page .badge').first().textContent()).trim()
    check(`[${tz}] "Open now" badge follows local time`, local.openNow ? badge === 'Open now' : /^Opens /.test(badge), `${badge} (local open: ${local.openNow})`)
    // Owner side: the seeded request shows 15:00 tomorrow.
    const o = await open(ctx, null, errors)
    await o.goto(BASE + '#/')
    await o.evaluate(() => sessionStorage.setItem('pp.session.main', 'u_owner_demo'))
    await o.goto('about:blank')
    await o.goto(BASE + '#/owner')
    const card = await o.locator('.request-card[data-booking="bk_pending_1"]').textContent()
    check(`[${tz}] owner sees the seeded request at 15:00–16:00`, /15:00–16:00/.test(card), card.slice(0, 120))
    await o.goto(BASE + '#/owner/earnings')
    await o.locator('.week-chart').waitFor()
    check(`[${tz}] earnings chart has no bad text`, (await badText(o)) === '')
    check(`[${tz}] no console errors`, errors.length === 0, errors.join(' | '))
    await ctx.close()
  }
}

// ── Clock edges ──────────────────────────────────────────────────────────────────────────────
if (want('clock')) {
  const at = async (iso, label, body) => {
    const errors = []
    const ctx = await chromium.newContext({ ...PHONE, timezoneId: 'Asia/Hong_Kong' })
    const p = await open(ctx, 'u_driver_demo', errors)
    await p.clock.install({ time: new Date(iso) })
    await body(p, ctx, errors)
    check(`[${label}] no console errors`, errors.length === 0, errors.join(' | '))
    await ctx.close()
  }
  // Friday 23:55 → the day rolls over mid-flow.
  await at('2026-11-20T23:55:00+08:00', '23:55', async (p) => {
    const s = await bookingSheet(p)
    const days = await s.locator('[aria-label="Day"] .chip').evaluateAll((els) => els.map((e) => `${e.textContent}${e.getAttribute('aria-pressed') === 'true' ? '*' : ''}${e.disabled ? '(off)' : ''}`))
    check('[23:55] default day is Tomorrow (today has no future slot)', days[1] === 'Tomorrow*', days.join(' '))
    await s.getByRole('button', { name: '10:00', exact: true }).click()
    check('[23:55] tomorrow 10:00 taken', (await slotCheck(p)) === 'taken')
    await s.getByRole('button', { name: '12:00', exact: true }).click()
    await s.getByRole('button', { name: /^Request booking ·/ }).click()
    check('[23:55] request goes through', await seen(p.locator('.status-card[data-status="pending"]')))
    const dateBefore = await p.locator('.kv dd').first().textContent()
    await p.clock.fastForward('00:10:00') // now Saturday 00:05
    await p.goto(BASE + '#/app/bookings')
    await p.locator('.booking-card').first().waitFor()
    check('[23:55→00:05] bookings list is sane after midnight', (await badText(p)) === '', await badText(p))
    const s2 = await bookingSheet(p)
    const days2 = await s2.locator('[aria-label="Day"] .chip').evaluateAll((els) => els.map((e) => `${e.textContent}${e.getAttribute('aria-pressed') === 'true' ? '*' : ''}`))
    await s2.getByRole('button', { name: 'Today', exact: true }).click()
    await s2.getByRole('button', { name: '10:00', exact: true }).click()
    check('[23:55→00:05] the blocked slot is now "Today 10:00" and still taken', (await slotCheck(p)) === 'taken', `${days2.join(' ')} · booked for ${dateBefore}`)
  })
  // 00:05: fresh seed just after midnight.
  await at('2026-11-21T00:05:00+08:00', '00:05', async (p) => {
    const s = await bookingSheet(p)
    await s.getByRole('button', { name: 'Tomorrow', exact: true }).click()
    await s.getByRole('button', { name: '10:00', exact: true }).click()
    check('[00:05] tomorrow 10:00 taken', (await slotCheck(p)) === 'taken')
    await p.goto(BASE + '#/app')
    await p.locator('.spot-card').first().waitFor()
    check('[00:05] map list has no bad text', (await badText(p)) === '')
  })
  // Spot about to close: Kwun Tong closes at 22:00.
  await at('2026-11-20T21:20:00+08:00', '21:20', async (p) => {
    const s = await bookingSheet(p)
    await s.getByRole('button', { name: 'Today', exact: true }).click()
    const last = s.getByRole('button', { name: '21:30', exact: true })
    check('[21:20] 21:30 today is offered', await last.isEnabled())
    await last.click()
    const durs = await s.locator('[aria-label="Duration"] .chip').evaluateAll((els) => els.map((e) => `${e.textContent}${e.getAttribute('aria-pressed') === 'true' ? '*' : ''}${e.disabled ? '(off)' : ''}`))
    check('[21:20] only durations that end by 22:00 are enabled (30 min picked)', durs.join(' ') === '15 min 30 min* 1 h(off) 2 h(off)', durs.join(' '))
    check('[21:20] slot ok', (await slotCheck(p)) === 'ok')
    await p.clock.fastForward('00:15:00') // 21:35: the chosen start is now in the past
    await s.getByRole('button', { name: /^Request booking ·/ }).click()
    const refused = await seen(s.locator('.notice'), 4000)
    const went = /#\/app\/booking\//.test(p.url())
    check('[21:35] a start time that slipped into the past is refused', refused && !went, `notice: ${refused}, navigated: ${went} · ${refused ? (await s.locator('.notice').innerText()).replace(/\n/g, ' / ') : ''}`)
  })
  await at('2026-11-20T21:50:00+08:00', '21:50', async (p) => {
    const s = await bookingSheet(p)
    const days = await s.locator('[aria-label="Day"] .chip').evaluateAll((els) => els.map((e) => `${e.textContent}${e.getAttribute('aria-pressed') === 'true' ? '*' : ''}`))
    check('[21:50] no slot left today → Tomorrow preselected', days[1] === 'Tomorrow*', days.join(' '))
    await p.goto(BASE + '#/app/spot/sp_kwuntong_1')
    check('[21:50] still "Open now" until 22:00', (await p.locator('.page .badge').first().textContent()).trim() === 'Open now')
  })
}

// ── Navigation abuse ─────────────────────────────────────────────────────────────────────────
if (want('nav')) {
  const routes = {
    driver: ['#/app', '#/app/bookings', '#/app/account', '#/app/spot/sp_kwuntong_1', '#/app/booking/bk_hist_3', '#/app/pay/bk_hist_3', '#/app/confirm/bk_hist_3', '#/app/session/bk_hist_3', '#/app/rate/bk_hist_3'],
    owner: ['#/owner', '#/owner/earnings', '#/owner/spots', '#/owner/spots/sp_kwuntong_1', '#/owner/apply', '#/owner/account', '#/owner/setup/sp_kwuntong_1', '#/owner/apply/sp_kwuntong_1'],
    anon: ['#/', '#/login', '#/register', '#/register?role=owner', '#/verify', '#/presenter'],
  }
  const bad = ['#/nope', '#/app/spot/nope', '#/app/booking/nope', '#/app/pay/nope', '#/app/confirm/nope', '#/app/session/nope', '#/app/rate/nope', '#/owner/spots/nope', '#/owner/setup/nope', '#/owner/apply/nope', '#/app/spot/%E0%A4%A', '#/app/spot/<script>alert(1)</script>', '#app', '#//', '#/app/spot/', '#/APP']
  for (const [who, list] of Object.entries(routes)) {
    const errors = []
    const ctx = await chromium.newContext(PHONE)
    const p = await open(ctx, who === 'anon' ? null : `u_${who}_demo`, errors)
    const failures = []
    for (const r of [...list, ...bad, ...(who === 'driver' ? routes.owner : who === 'owner' ? routes.driver : [...routes.driver, ...routes.owner])]) {
      await p.goto('about:blank')
      await p.goto(BASE + r)
      await p.waitForTimeout(350)
      await p.reload()
      await p.waitForTimeout(450)
      if (await blank(p)) failures.push(`${r} → blank (${await p.evaluate(() => location.hash)})`)
      const bt = await badText(p)
      if (bt) failures.push(`${r} → bad text ${bt}`)
    }
    check(`[nav ${who}] every route + bad id survives a hard refresh (no blank screen)`, failures.length === 0, failures.join(' | '))
    check(`[nav ${who}] no console errors`, errors.length === 0, [...new Set(errors)].slice(0, 4).join(' | '))
    await ctx.close()
  }
  // Browser Back / Forward through the driver flow.
  {
    const errors = []
    const ctx = await chromium.newContext(PHONE)
    const p = await open(ctx, 'u_driver_demo', errors)
    await p.goto(BASE + '#/app')
    await p.locator('.spot-card[data-spot="sp_kwuntong_1"]').click()
    await p.getByRole('button', { name: 'View details' }).click()
    await p.locator('.carousel').waitFor()
    await p.goBack()
    check('[nav] Back from details → map', await seen(p.locator('.map-home')))
    await p.goForward()
    check('[nav] Forward → details again', await seen(p.locator('.carousel')))
    const s = p.getByRole('dialog', { name: 'Request booking' })
    await p.getByRole('button', { name: 'Request booking', exact: true }).click()
    await s.getByRole('button', { name: 'Tomorrow', exact: true }).click()
    await s.getByRole('button', { name: '13:00', exact: true }).click()
    await s.getByRole('button', { name: /^Request booking ·/ }).click()
    await p.locator('.status-card[data-status="pending"]').waitFor()
    await p.goBack()
    await p.waitForTimeout(400)
    const afterBack = await p.evaluate(() => location.hash)
    await p.goForward()
    await p.waitForTimeout(400)
    const n = (await db(p)).bookings.filter((b) => b.driverId === 'u_driver_demo' && b.status === 'pending').length
    check('[nav] Back/Forward around a new request never duplicates it', n === 1, `pending: ${n}, back went to ${afterBack}`)
    // In-app back after a browser Back must stay inside the app.
    await p.goto('about:blank')
    await p.goto(BASE + '#/login')
    await p.getByRole('button', { name: /Demo driver/ }).click()
    await p.getByRole('button', { name: 'Log in' }).click()
    await p.getByLabel('Digit 1 of 6').waitFor()
    await p.goBack()
    await p.getByRole('button', { name: 'Back' }).first().waitFor()
    await p.getByRole('button', { name: 'Back' }).first().click()
    await p.waitForTimeout(500)
    check('[nav] in-app Back after a browser Back stays in the app', p.url().startsWith(BASE), p.url())
    check('[nav] no console errors in back/forward', errors.length === 0, errors.join(' | '))
    await ctx.close()
  }
}

// ── Hostile input ────────────────────────────────────────────────────────────────────────────
if (want('hostile')) {
  const errors = []
  const ctx = await chromium.newContext(PHONE)
  const p = await open(ctx, 'u_driver_demo', errors)
  await p.goto(BASE + '#/app')
  await p.locator('.spot-card').first().waitFor()
  const XSS = '<img src=x onerror="window.__xss=1"><script>window.__xss=1</script>'
  const LONG = 'W'.repeat(60)
  await patchDB(
    p,
    (d, [XSS, LONG]) => {
      const sp = d.spots.find((s) => s.id === 'sp_kwuntong_1')
      sp.title = LONG
      sp.address = XSS + ' ' + 'M'.repeat(100)
      sp.instructions = XSS + ' 陳大文 😀 ' + 'i'.repeat(150)
      sp.amenities = [XSS, 'A'.repeat(40)]
      d.users.find((u) => u.id === 'u_owner_demo').name = 'Ŵ'.repeat(40)
      d.users.find((u) => u.id === 'u_driver_demo').name = 'M'.repeat(40)
      d.users.find((u) => u.id === 'u_driver_3').name = '陳大文 😀 ' + XSS
      d.reviews.unshift({ id: 'rv_x', bookingId: '', spotId: 'sp_kwuntong_1', driverId: 'u_driver_3', rating: 5, text: XSS + ' ' + 'x'.repeat(280), createdAt: new Date().toISOString() })
      const t = new Date()
      t.setDate(t.getDate() + 1)
      t.setHours(16, 0, 0, 0)
      const mk = (id, status, extra = {}) => d.bookings.push({ id, spotId: 'sp_kwuntong_1', driverId: 'u_driver_demo', ownerId: 'u_owner_demo', start: t.toISOString(), durationMinutes: 60, price: 30, commissionRate: 0.18, status, createdAt: t.toISOString(), updatedAt: t.toISOString(), ...extra })
      mk('bk_x_pending', 'pending')
      mk('bk_x_conf', 'confirmed')
      mk('bk_x_paid', 'paid', { paymentLast4: '4242', pin: '7350' })
      mk('bk_x_declined', 'declined', { declineReason: XSS + 'r'.repeat(80) })
      mk('bk_x_done', 'completed', { paymentLast4: '4242', energyKwh: 12, startedAt: t.toISOString(), completedAt: t.toISOString() })
    },
    [XSS, LONG],
  )
  const visit = async (page, who, routes) => {
    for (const r of routes) {
      await page.goto('about:blank')
      await page.goto(BASE + r)
      await page.waitForTimeout(500)
      const o = await overflow(page)
      check(`[hostile ${who}] ${r} — no horizontal overflow with 60-char words, emoji, CJK`, o === '', o)
    }
  }
  await visit(p, 'driver', ['#/app', '#/app/spot/sp_kwuntong_1', '#/app/bookings', '#/app/booking/bk_x_pending', '#/app/booking/bk_x_declined', '#/app/pay/bk_x_conf', '#/app/confirm/bk_x_paid', '#/app/session/bk_x_done', '#/app/rate/bk_x_done', '#/app/account'])
  // Past tab too
  await p.goto(BASE + '#/app/bookings')
  await p.getByRole('tab', { name: 'Past' }).click()
  check('[hostile driver] bookings › Past — no overflow', (await overflow(p)) === '', await overflow(p))
  const o = await open(ctx, null, errors)
  await o.goto(BASE + '#/')
  await o.evaluate(() => sessionStorage.setItem('pp.session.main', 'u_owner_demo'))
  await visit(o, 'owner', ['#/owner', '#/owner/earnings', '#/owner/spots', '#/owner/spots/sp_kwuntong_1', '#/owner/account'])
  check('[hostile] stored text is never executed as HTML', !(await p.evaluate(() => window.__xss)) && !(await o.evaluate(() => window.__xss)))

  // Typed input: pasted card / phone values, spaces, the review box.
  await p.goto(BASE + '#/app/pay/bk_x_conf')
  await p.getByLabel('Card number').fill('4242-4242-4242-4242')
  await p.getByLabel('Expiry').fill('12 / 30')
  await p.getByLabel('CVC').fill(' 1 2 3 4 ')
  await p.getByLabel('Name on card').fill('  陳大文 😀  ')
  const vals = [await p.getByLabel('Card number').inputValue(), await p.getByLabel('Expiry').inputValue(), await p.getByLabel('CVC').inputValue()]
  check('[hostile] pasted card with dashes / spaces is normalised', vals.join('|') === '4242 4242 4242 4242|12/30|123', vals.join('|'))
  await p.getByRole('button', { name: /^Pay HK\$/ }).click()
  check('[hostile] …and pays', await seen(p.locator('svg.qr'), 6000))
  const raw = await p.evaluate(() => JSON.stringify({ ...localStorage }) + JSON.stringify({ ...sessionStorage }))
  check('[hostile] no card number / expiry / CVC in storage after paying', !/4242 ?4242|4242424242424242|12\/30|"cvc"/i.test(raw))
  await p.goto(BASE + '#/app/rate/bk_x_done')
  await p.getByRole('radio', { name: '5 stars' }).click()
  await p.locator('#review-text').fill('  ' + XSS + ' 😀'.repeat(200))
  await p.getByRole('button', { name: 'Submit review' }).click()
  await p.getByText('Thanks for your review!').waitFor()
  const rv = (await db(p)).reviews[0]
  check('[hostile] review is trimmed and capped at 300 characters', rv.text.length <= 300 && !rv.text.startsWith(' '), `${rv.text.length}`)
  await p.goto(BASE + '#/app/spot/sp_kwuntong_1')
  await p.locator('#reviews').scrollIntoViewIfNeeded()
  check('[hostile] typed review shows as text, nothing executed', !(await p.evaluate(() => window.__xss)) && (await overflow(p)) === '', await overflow(p))

  // Registration: names, phone paste, email spaces.
  const a = await open(await chromium.newContext(PHONE), null, errors)
  await a.goto(BASE + '#/register?role=driver')
  const nameErr = async (v) => {
    await a.getByLabel('Full name').fill(v)
    await a.getByLabel('Full name').blur()
    await a.waitForTimeout(60)
    return a.getByText('Enter your full name').isVisible()
  }
  check('[hostile] name: <script> rejected', await nameErr('<script>alert(1)</script>'))
  check('[hostile] name: 41 characters rejected', await nameErr('A'.repeat(41)))
  check('[hostile] name: emoji rejected', await nameErr('😀😀😀'))
  check('[hostile] name: Chinese accepted', !(await nameErr('陳大文')))
  check("[hostile] name: O'Brien-Smith with spaces accepted", !(await nameErr("  Mary  O'Brien-Smith ")))
  await a.getByLabel('Mobile number').fill('+852 9123-4567')
  const ph = await a.getByLabel('Mobile number').inputValue()
  check('[hostile] pasted "+852 9123-4567" → what the field keeps', /^9123 4567$|^8529 1234$/.test(ph), ph)
  await a.getByLabel('Email').fill('  New.Person@Example.COM  ')
  await a.getByLabel('Email').blur()
  check('[hostile] email with spaces / capitals accepted', !(await a.getByText('Enter a valid email').isVisible()))
  await a.context().close()
  check('[hostile] no console errors', errors.length === 0, [...new Set(errors)].slice(0, 5).join(' | '))
  await ctx.close()
}

// ── Storage stress ───────────────────────────────────────────────────────────────────────────
if (want('storage')) {
  // Nearly full localStorage: actions keep working in memory and the notice shows.
  {
    const errors = []
    const ctx = await chromium.newContext(PHONE)
    const p = await open(ctx, 'u_driver_demo', errors)
    await p.goto(BASE + '#/app')
    await p.locator('.spot-card').first().waitFor()
    const filled = await p.evaluate(() => {
      let chunk = 'x'.repeat(1024 * 1024)
      let n = 0
      for (let i = 0; i < 40 && chunk.length > 8; ) {
        try {
          localStorage.setItem('fill' + i, chunk)
          n += chunk.length
          i++
        } catch {
          chunk = chunk.slice(0, chunk.length / 2)
        }
      }
      return n
    })
    const s = await bookingSheet(p)
    await s.getByRole('button', { name: 'Tomorrow', exact: true }).click()
    await s.getByRole('button', { name: '13:00', exact: true }).click()
    await s.getByRole('button', { name: /^Request booking ·/ }).click()
    const pending = await seen(p.locator('.status-card[data-status="pending"]'))
    check('[storage full] request still works (in memory)', pending, `filled ${(filled / 1e6).toFixed(1)} MB`)
    check('[storage full] "Storage is blocked" notice shows', await seen(p.locator('.storage-notice'), 2000))
    await p.getByRole('button', { name: /Cancel request/ }).click()
    await p.getByRole('button', { name: /Tap again/ }).click()
    check('[storage full] further actions keep working', await seen(p.locator('.status-card[data-status="cancelled"]')))
    check('[storage full] no console errors', errors.length === 0, errors.join(' | '))
    await ctx.close()
  }
  // Corrupt data mid-session (this window keeps going; a reload re-seeds).
  for (const [label, value] of [['broken JSON', '{"version":5,"users":['], ['wrong shape', '{"version":5}'], ['old version', '{"version":1,"users":[]}'], ['null', 'null'], ['array fields missing', '{"version":5,"users":[],"spots":{}}']]) {
    const errors = []
    const ctx = await chromium.newContext(PHONE)
    const p = await open(ctx, 'u_driver_demo', errors)
    await p.goto(BASE + '#/app/bookings')
    await p.locator('.booking-card, .empty-state').first().waitFor()
    await p.evaluate((v) => localStorage.setItem('pp.db', v), value)
    await p.getByRole('tab', { name: 'Past' }).click()
    const alive = await seen(p.locator('.booking-card').first(), 2000)
    await p.reload()
    await p.waitForTimeout(600)
    const ok = (await seen(p.locator('.booking-card, .empty-state').first(), 3000)) && !(await blank(p))
    const reseeded = await p.evaluate(() => {
      try {
        const d = JSON.parse(localStorage.getItem('pp.db'))
        return d.version === 5 && d.spots.length >= 12
      } catch {
        return false
      }
    })
    check(`[corrupt: ${label}] session survives, reload re-seeds cleanly`, alive && ok && reseeded && errors.length === 0, `alive ${alive}, after reload ${ok}, reseeded ${reseeded} ${errors.slice(0, 2).join(' | ')}`)
    await ctx.close()
  }
  // A second window writes corrupt data → this window must not crash on the storage event.
  {
    const errors = []
    const ctx = await chromium.newContext(PHONE)
    const p = await open(ctx, 'u_driver_demo', errors)
    const q = await open(ctx, 'u_driver_demo', errors)
    await p.goto(BASE + '#/app/bookings')
    await q.goto(BASE + '#/app/bookings')
    await p.locator('.booking-card, .empty-state').first().waitFor()
    for (const v of ['{"version":5}', 'garbage', '{"version":5,"users":[],"spots":{}}']) {
      await q.evaluate((v) => localStorage.setItem('pp.db', v), v)
      await p.waitForTimeout(300)
    }
    await p.getByRole('tab', { name: 'Past' }).click().catch(() => {})
    check('[corrupt from another window] this window keeps rendering', !(await blank(p)) && errors.length === 0, errors.slice(0, 2).join(' | '))
    await ctx.close()
  }
}

// ── Network ──────────────────────────────────────────────────────────────────────────────────
if (want('net')) {
  // Slow 3G: the landing page and the map both come up; skeleton shows while the map chunk loads.
  const errors = []
  const ctx = await chromium.newContext(PHONE)
  const p = await open(ctx, 'u_driver_demo', errors)
  const cdp = await ctx.newCDPSession(p)
  await cdp.send('Network.enable')
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 400, downloadThroughput: (500 * 1024) / 8, uploadThroughput: (500 * 1024) / 8 })
  const t0 = Date.now()
  await p.goto(BASE + '#/', { waitUntil: 'commit' })
  const landing = await seen(p.getByText('Charge where'), 30000)
  const tLanding = Date.now() - t0
  await p.goto('about:blank')
  const t1 = Date.now()
  await p.goto(BASE + '#/app', { waitUntil: 'commit' })
  const list = await seen(p.locator('.spot-card').first(), 40000)
  check('[slow 3G] landing renders', landing, `${tLanding} ms`)
  check('[slow 3G] map screen renders its list', list, `${Date.now() - t1} ms`)
  // Fully offline after load: every lazy screen still opens (chunks were warmed 3 s after start).
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 })
  await p.goto('about:blank')
  await p.goto(BASE + '#/app/bookings')
  await p.waitForTimeout(4500) // warm-up of lazy chunks
  await ctx.setOffline(true)
  await p.getByRole('button', { name: 'Explore' }).click()
  check('[offline after load] map screen still opens', await seen(p.locator('.spot-card').first(), 12000))
  await p.locator('.spot-card[data-spot="sp_kwuntong_1"]').click()
  await p.getByRole('button', { name: 'View details' }).click()
  check('[offline after load] spot details open', await seen(p.locator('.carousel')))
  check('[net] no console errors', errors.length === 0, errors.join(' | '))
  await ctx.close()
}

// ── Mobile sizes in WebKit ───────────────────────────────────────────────────────────────────
if (want('sizes')) {
  const webkit = await playwright.webkit.launch()
  for (const [w, h] of [[375, 667], [430, 932]]) {
    for (const who of ['driver', 'owner']) {
      const errors = []
      const ctx = await webkit.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 })
      const p = await open(ctx, `u_${who}_demo`, errors)
      await p.goto(BASE + '#/')
      await patchDB(p, (d) => {
        const t = new Date()
        t.setDate(t.getDate() + 1)
        t.setHours(16, 0, 0, 0)
        const mk = (id, status, extra = {}) => d.bookings.some((b) => b.id === id) || d.bookings.push({ id, spotId: 'sp_kwuntong_1', driverId: 'u_driver_demo', ownerId: 'u_owner_demo', start: t.toISOString(), durationMinutes: 60, price: 30, commissionRate: 0.18, status, createdAt: t.toISOString(), updatedAt: t.toISOString(), ...extra })
        mk('bk_s_conf', 'confirmed')
        mk('bk_s_paid', 'paid', { paymentLast4: '4242', pin: '7350' })
        mk('bk_s_done', 'completed', { paymentLast4: '4242', energyKwh: 12, startedAt: t.toISOString(), completedAt: t.toISOString() })
      })
      const routes = who === 'driver' ? ['#/app', '#/app/spot/sp_kwuntong_1', '#/app/bookings', '#/app/pay/bk_s_conf', '#/app/confirm/bk_s_paid', '#/app/session/bk_s_done', '#/app/rate/bk_s_done', '#/app/account'] : ['#/owner', '#/owner/earnings', '#/owner/spots', '#/owner/spots/sp_kwuntong_1', '#/owner/apply', '#/owner/account']
      const bad = []
      for (const r of routes) {
        await p.goto('about:blank')
        await p.goto(BASE + r)
        await p.waitForTimeout(600)
        const o = await overflow(p)
        if (o) bad.push(`${r}: overflow ${o}`)
        const small = await p.evaluate(() => [...document.querySelectorAll('input:not([type=checkbox]):not([type=range]):not([type=file]), select, textarea')].filter((el) => parseFloat(getComputedStyle(el).fontSize) < 16).map((el) => el.getAttribute('aria-label') || el.id || el.className))
        if (small.length) bad.push(`${r}: inputs under 16px: ${small.join(',')}`)
        // The primary action is fully inside the viewport.
        const cut = await p.evaluate(() => [...document.querySelectorAll('.bottom-bar .btn, .sticky-bar .btn, .tab-bar')].filter((el) => { const b = el.getBoundingClientRect(); return b.bottom > innerHeight + 1 || b.right > innerWidth + 1 || b.left < -1 }).map((el) => el.textContent.trim().slice(0, 20)))
        if (cut.length) bad.push(`${r}: cut off: ${cut.join(',')}`)
      }
      if (who === 'driver') {
        const s = await bookingSheet(p)
        await s.getByRole('button', { name: 'Tomorrow', exact: true }).click()
        await s.getByRole('button', { name: '13:00', exact: true }).click()
        const btn = await s.getByRole('button', { name: /^Request booking ·/ }).boundingBox()
        if (!btn || btn.y + btn.height > h + 1) bad.push(`booking sheet CTA below the fold (${JSON.stringify(btn)})`)
        // Focusing the last payment field scrolls it into view.
        await p.goto(BASE + '#/app/pay/bk_s_conf')
        await p.getByLabel('Name on card').focus()
        const bb = await p.getByLabel('Name on card').boundingBox()
        if (!bb || bb.y < 0 || bb.y + bb.height > h) bad.push(`focused input not in view (${JSON.stringify(bb)})`)
      } else {
        await p.goto(BASE + '#/owner/earnings')
        await p.getByRole('button', { name: 'Withdraw', exact: true }).click()
        const btn = await p.getByRole('button', { name: /^Withdraw HK\$/ }).boundingBox()
        if (!btn || btn.y + btn.height > h + 1) bad.push(`withdraw CTA below the fold (${JSON.stringify(btn)})`)
        const small = await p.evaluate(() => [...document.querySelectorAll('.sheet input, .sheet select')].filter((el) => parseFloat(getComputedStyle(el).fontSize) < 16).length)
        if (small) bad.push('withdraw sheet inputs under 16px')
      }
      check(`[webkit ${w}×${h} ${who}] no overflow, inputs ≥ 16px, CTAs on screen`, bad.length === 0, bad.join(' | '))
      check(`[webkit ${w}×${h} ${who}] no console errors`, errors.length === 0, [...new Set(errors)].slice(0, 3).join(' | '))
      await ctx.close()
    }
  }
  // Auth screens at the small size.
  {
    const errors = []
    const ctx = await webkit.newContext({ viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true })
    const p = await open(ctx, null, errors)
    const bad = []
    for (const r of ['#/', '#/login', '#/register']) {
      await p.goto('about:blank')
      await p.goto(BASE + r)
      await p.waitForTimeout(500)
      const o = await overflow(p)
      if (o) bad.push(`${r}: overflow ${o}`)
      const small = await p.evaluate(() => [...document.querySelectorAll('input:not([type=checkbox]), select, textarea')].filter((el) => parseFloat(getComputedStyle(el).fontSize) < 16).length)
      if (small) bad.push(`${r}: ${small} inputs under 16px`)
    }
    const dvh = await p.evaluate(() => [...document.styleSheets].some((s) => { try { return [...s.cssRules].some((r) => /100dvh/.test(r.cssText)) } catch { return false } }))
    check('[webkit 375×667 auth] no overflow, inputs ≥ 16px', bad.length === 0 && errors.length === 0, bad.concat(errors).join(' | '))
    check('[webkit] the full-screen layout uses 100dvh', dvh)
    await ctx.close()
  }
  await webkit.close()
}

// ── Double taps ──────────────────────────────────────────────────────────────────────────────
if (want('taps')) {
  const errors = []
  const ctx = await chromium.newContext(PHONE)
  const p = await open(ctx, 'u_driver_demo', errors)
  const dbl = (loc) => loc.dblclick({ delay: 20 })
  const s = await bookingSheet(p)
  await s.getByRole('button', { name: 'Tomorrow', exact: true }).click()
  await s.getByRole('button', { name: '13:00', exact: true }).click()
  await dbl(s.getByRole('button', { name: /^Request booking ·/ }))
  await p.locator('.status-card[data-status="pending"]').waitFor()
  const id = p.url().split('/').pop()
  check('[double tap] Request booking → one booking', (await db(p)).bookings.filter((b) => b.driverId === 'u_driver_demo' && b.status === 'pending').length === 1)
  const o = await open(ctx, null, errors)
  await o.goto(BASE + '#/')
  await o.evaluate(() => sessionStorage.setItem('pp.session.main', 'u_owner_demo'))
  await o.goto('about:blank')
  await o.goto(BASE + '#/owner')
  await dbl(o.locator(`.request-card[data-booking="${id}"]`).getByRole('button', { name: 'Approve' }))
  await p.locator('.status-card[data-status="confirmed"]').waitFor()
  check('[double tap] Approve → confirmed once, no error banner', !(await o.locator('.banner.error').isVisible()))
  await dbl(p.getByRole('button', { name: /^Pay HK\$/ }))
  await p.getByRole('button', { name: 'Use test card' }).click()
  await dbl(p.getByRole('button', { name: /^Pay HK\$/ }))
  await p.locator('svg.qr').waitFor({ timeout: 8000 })
  await dbl(p.getByRole('button', { name: /start charging/ }))
  await p.locator('.ring-wrap').waitFor({ timeout: 8000 })
  const b1 = (await db(p)).bookings.find((b) => b.id === id)
  check('[double tap] Pay + Start → one active session', b1.status === 'active' && !!b1.startedAt)
  await dbl(p.getByRole('button', { name: 'Stop charging' }))
  check('[double tap] Stop charging (needs two deliberate taps: a double tap does stop)', await seen(p.getByText('Session complete'), 4000))
  await p.getByRole('button', { name: 'Rate your experience' }).click()
  await p.getByRole('radio', { name: '4 stars' }).click()
  await dbl(p.getByRole('button', { name: 'Submit review' }))
  await p.getByText('Thanks for your review!').waitFor()
  check('[double tap] Submit review → one review', (await db(p)).reviews.filter((r) => r.bookingId === id).length === 1)
  await o.goto(BASE + '#/owner/earnings')
  await o.getByRole('button', { name: 'Withdraw', exact: true }).click()
  await dbl(o.getByRole('button', { name: /^Withdraw HK\$/ }))
  await o.getByText(/On its way/).waitFor()
  const d2 = await db(o)
  const total = d2.payouts.reduce((a, x) => a + x.amount, 0)
  check('[double tap] Withdraw → one payout, balance not negative', d2.payouts.length === 1 && +(await o.locator('[data-available]').getAttribute('data-available')) === 0, `payouts ${d2.payouts.length}, total ${total}`)
  check('[double tap] no console errors', errors.length === 0, errors.join(' | '))
  await ctx.close()
}

// ── The same booking open in two tabs ────────────────────────────────────────────────────────
if (want('tabs')) {
  const errors = []
  const ctx = await chromium.newContext(PHONE)
  const a = await open(ctx, 'u_driver_demo', errors)
  await a.goto(BASE + '#/app')
  await a.locator('.spot-card').first().waitFor()
  await patchDB(a, (d) => {
    const t = new Date()
    t.setDate(t.getDate() + 1)
    t.setHours(16, 0, 0, 0)
    d.bookings.push({ id: 'bk_two', spotId: 'sp_kwuntong_1', driverId: 'u_driver_demo', ownerId: 'u_owner_demo', start: t.toISOString(), durationMinutes: 60, price: 30, commissionRate: 0.18, status: 'confirmed', createdAt: t.toISOString(), updatedAt: t.toISOString() })
  })
  const b = await open(ctx, 'u_driver_demo', errors)
  await a.goto(BASE + '#/app/pay/bk_two')
  await b.goto(BASE + '#/app/pay/bk_two')
  await a.getByRole('button', { name: 'Use test card' }).click()
  await b.getByRole('button', { name: 'Use test card' }).click()
  await a.getByRole('button', { name: /^Pay HK\$/ }).click()
  await b.getByRole('button', { name: /^Pay HK\$/ }).click()
  await a.locator('svg.qr').waitFor({ timeout: 8000 })
  const bEnds = await seen(b.locator('svg.qr, .status-card'), 8000)
  check('[two tabs] paying in both → paid once, both tabs land on a real screen', bEnds && (await db(a)).bookings.find((x) => x.id === 'bk_two').status === 'paid', await b.evaluate(() => location.hash))
  await b.goto(BASE + '#/app/confirm/bk_two')
  await a.getByRole('button', { name: /start charging/ }).click()
  await b.getByRole('button', { name: /start charging/ }).click().catch(() => {})
  await a.locator('.ring-wrap').waitFor({ timeout: 8000 })
  check('[two tabs] starting in both → one session, second tab follows', await seen(b.locator('.ring-wrap'), 8000))
  await a.getByText('Session complete').waitFor({ timeout: 35000 })
  await b.getByText('Session complete').waitFor({ timeout: 5000 })
  const done = (await db(a)).bookings.find((x) => x.id === 'bk_two')
  check('[two tabs] completed once with the same figures in both tabs', done.status === 'completed' && (await a.locator('.session-tiles').innerText()) === (await b.locator('.session-tiles').innerText()), `${done.energyKwh} kWh`)
  check('[two tabs] no console errors', errors.length === 0, errors.join(' | '))
  await ctx.close()
}

// ── Leaks: 20 round trips map ↔ bookings ↔ details, then compare DOM nodes / listeners ───────
if (want('leak')) {
  const errors = []
  const ctx = await chromium.newContext(PHONE)
  const p = await open(ctx, 'u_driver_demo', errors)
  const cdp = await ctx.newCDPSession(p)
  await cdp.send('Performance.enable')
  const metrics = async () => {
    await cdp.send('HeapProfiler.collectGarbage')
    await p.waitForTimeout(300)
    await cdp.send('HeapProfiler.collectGarbage')
    const m = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((x) => [x.name, x.value]))
    return { nodes: m.Nodes, listeners: m.JSEventListeners, heapMB: +(m.JSHeapUsedSize / 1e6).toFixed(1) }
  }
  const trip = async () => {
    await p.getByRole('button', { name: 'Bookings' }).click()
    await p.locator('.booking-card, .empty-state').first().waitFor()
    await p.getByRole('button', { name: 'Explore' }).click()
    await p.locator('.spot-card[data-spot="sp_kwuntong_1"]').click()
    await p.getByRole('button', { name: 'View details' }).click()
    await p.locator('.carousel').waitFor()
    await p.getByRole('button', { name: 'Back' }).first().click()
    await p.locator('.spot-preview').waitFor()
    await p.getByRole('button', { name: 'Close preview' }).click()
  }
  await p.goto(BASE + '#/app')
  await p.locator('.spot-card').first().waitFor()
  for (let i = 0; i < 3; i++) await trip()
  const before = await metrics()
  for (let i = 0; i < 20; i++) await trip()
  const after = await metrics()
  const maps = await p.evaluate(() => document.querySelectorAll('.leaflet-container').length)
  check('[leak] 20 round trips: one live map, DOM nodes and listeners do not grow', maps === 1 && after.nodes < before.nodes * 1.25 + 200 && after.listeners < before.listeners * 1.25 + 50, `before ${JSON.stringify(before)} after ${JSON.stringify(after)}`)
  check('[leak] no console errors', errors.length === 0, errors.join(' | '))
  await ctx.close()
}

await chromium.close()
const failed = results.filter((r) => r.startsWith('FAIL'))
console.log(`\n${results.length - failed.length}/${results.length} passed`)
if (failed.length) console.log(failed.join('\n'))
process.exit(failed.length ? 1 : 0)
