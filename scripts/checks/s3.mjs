// Checks the S3 "done when" items. Run via `npm run check` (or with `npm run preview` running: node scripts/checks/s3.mjs)
import { chromium } from 'playwright'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const BASE = process.env.PP_BASE ?? 'http://localhost:4173/plug-and-park/'
const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'src', 'lib')
const results = []
const check = (name, ok, extra = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? ' - ' + extra : ''}`)
const seen = (loc, timeout = 4000) => loc.waitFor({ timeout }).then(() => true, () => false)
const IGNORE = /tile\.openstreetmap|basemaps\.cartocdn|fonts\.g|ERR_FAILED|net::/

// ── 1. Pure functions (Node 26 runs the .ts files directly; they only use `import type`) ──
{
  const { priceFor } = await import(pathToFileURL(path.join(SRC, 'pricing.ts')).href)
  const p30 = { pricePerHour: 30 }
  const p25 = { pricePerHour: 25 }
  check('priceFor $30/h: 15m 7.5, 30m 15, 1h 30, 2h 60', [15, 30, 60, 120].map((m) => priceFor(p30, m)).join() === '7.5,15,30,60')
  check('priceFor $25/h 15m = 6.50 (6.25 rounds up)', priceFor(p25, 15) === 6.5)

  const av = await import(pathToFileURL(path.join(SRC, 'availability.ts')).href)
  const wk = { availability: [1, 2, 3, 4, 5].map((day) => ({ day, start: '08:30', end: '19:00' })) }
  const every = { availability: [0, 1, 2, 3, 4, 5, 6].map((day) => ({ day, start: '07:00', end: '22:00' })) }
  const mixed = { availability: [0, 6].map((day) => ({ day, start: '09:00', end: '18:00' })).concat(wk.availability) }
  const at = (y, mo, d, h, mi) => new Date(y, mo - 1, d, h, mi)
  // 11 Nov 2026 is a Wednesday; 14 Nov a Saturday.
  check('isOpenAt weekday 10:00 open', av.isOpenAt(wk, at(2026, 11, 11, 10, 0)) === true)
  check('isOpenAt weekday 08:29 closed / 08:30 open', av.isOpenAt(wk, at(2026, 11, 11, 8, 29)) === false && av.isOpenAt(wk, at(2026, 11, 11, 8, 30)) === true)
  check('isOpenAt end is exclusive (19:00 closed)', av.isOpenAt(wk, at(2026, 11, 11, 19, 0)) === false)
  check('isOpenAt Saturday closed for weekday spot', av.isOpenAt(wk, at(2026, 11, 14, 12, 0)) === false)
  const nx = av.nextOpening(wk, at(2026, 11, 14, 12, 0))
  check('nextOpening Sat → Mon 08:30', nx && nx.getDay() === 1 && nx.getHours() === 8 && nx.getMinutes() === 30)
  check('formatAvailability weekdays', av.formatAvailability(wk).map((l) => l.label).join('|') === 'Mon–Fri 08:30–19:00')
  check('formatAvailability every day', av.formatAvailability(every).map((l) => l.label).join('|') === 'Every day 07:00–22:00')
  check('formatAvailability mixed', av.formatAvailability(mixed).map((l) => l.label).join('|') === 'Mon–Fri 08:30–19:00|Sat–Sun 09:00–18:00', av.formatAvailability(mixed).map((l) => l.label).join('|'))
  check('openStatus label "Opens 08:30" same day', av.openStatus(wk, at(2026, 11, 11, 7, 0)).label === 'Opens 08:30')
}

// ── Browser checks ──
const browser = await chromium.launch()
const errors = []
async function driverPage(device = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }, opts = {}) {
  const ctx = await browser.newContext(device)
  await ctx.addInitScript((uid) => {
    try {
      sessionStorage.getItem('pp.session.main') || sessionStorage.setItem('pp.session.main', uid)
    } catch {
      /* about:blank has no storage */
    }
  }, opts.user ?? 'u_driver_demo')
  if (opts.blockTiles) await ctx.route(/tile\.openstreetmap\.org|basemaps\.cartocdn\.com/, (r) => r.abort())
  const p = await ctx.newPage()
  p.on('pageerror', (e) => errors.push(e.message))
  p.on('console', (m) => m.type() === 'error' && !IGNORE.test(m.text()) && errors.push(m.text()))
  return { ctx, p }
}
const pins = (p) => p.locator('.pin')
const chip = (p, name) => p.getByRole('toolbar', { name: 'Filters' }).getByRole('button', { name, exact: true })
const sheetH = (p) => p.locator('.snap-sheet').evaluate((el) => el.offsetHeight)
const center = (p) => p.evaluate(() => {
  const pane = document.querySelector('.leaflet-map-pane')
  return pane.style.transform
})

// 2. Pins + filters + district
{
  const { ctx, p } = await driverPage()
  await p.goto(BASE + '#/app')
  await pins(p).first().waitFor()
  check('12 pins show', (await pins(p).count()) === 12)
  check('Sheet title "12 chargers nearby"', await seen(p.getByRole('heading', { name: '12 chargers nearby' })))
  const counts = {}
  for (const c of ['CCS2', 'Type 2', 'CHAdeMO', 'GB/T']) {
    await chip(p, c).click()
    counts[c] = await pins(p).count()
  }
  check('Charger filter counts CCS2 3 / Type 2 6 / CHAdeMO 2 / GB/T 1', counts.CCS2 === 3 && counts['Type 2'] === 6 && counts.CHAdeMO === 2 && counts['GB/T'] === 1, JSON.stringify(counts))
  await chip(p, 'All').click()
  await chip(p, 'Under $25').click()
  check('Under $25 → 6 pins', (await pins(p).count()) === 6, String(await pins(p).count()))
  await chip(p, 'Type 2').click()
  check('Type 2 + Under $25 → 4 pins', (await pins(p).count()) === 4, String(await pins(p).count()))
  await chip(p, 'Type 2').click() // toggles off
  await chip(p, 'CCS2').click()
  check('CCS2 + Under $25 → no results state', await seen(p.getByText('No chargers match these filters')))
  await p.getByRole('button', { name: 'Clear filters' }).click()
  check('Clear filters → 12 again', (await pins(p).count()) === 12)
  const openNowExpected = await p.evaluate(() => {
    const db = JSON.parse(localStorage.getItem('pp.db'))
    const now = new Date()
    const mins = now.getHours() * 60 + now.getMinutes()
    const t = (s) => +s.slice(0, 2) * 60 + +s.slice(3)
    return db.spots.filter((s) => s.availability.some((w) => w.day === now.getDay() && mins >= t(w.start) && mins < t(w.end))).length
  })
  await chip(p, 'Open now').click()
  check('Open now matches availability', (await pins(p).count()) === openNowExpected, `${await pins(p).count()} vs ${openNowExpected}`)
  await chip(p, 'Open now').click()

  // District sheet + fly
  const skPin = () => p.locator('.pin[data-spot="sp_saikung_1"]').boundingBox()
  const skBefore = await skPin()
  await p.getByRole('button', { name: /Where do you need to charge/ }).click()
  const dlg = p.getByRole('dialog', { name: 'Choose a district' })
  check('District sheet lists All + 10 districts', (await dlg.getByRole('button').filter({ hasText: /chargers?$|All districts/ }).count()) >= 11)
  check('District sheet shows counts (Sai Kung 2 chargers)', await seen(dlg.getByRole('button', { name: /Sai Kung.*2 chargers/ })))
  await dlg.getByRole('button', { name: /Sai Kung/ }).click()
  await p.waitForTimeout(1200)
  check('District filter → 2 pins', (await pins(p).count()) === 2)
  const skAfter = await skPin()
  check('District filter flies the map', !!skBefore && !!skAfter && Math.hypot(skAfter.x - skBefore.x, skAfter.y - skBefore.y) > 40, JSON.stringify([skBefore, skAfter].map((b) => b && [Math.round(b.x), Math.round(b.y)])))
  check('Search pill shows district', await seen(p.getByRole('button', { name: /Sai Kung/ }).first()))
  await ctx.close()
}

// 3. Selecting: pin + card, full screen
{
  const { ctx, p } = await driverPage()
  await p.goto(BASE + '#/app')
  await pins(p).first().waitFor()
  await p.locator('.pin[data-spot="sp_shatin_1"]').click()
  check('Pin tap selects that spot (full screen)', await seen(p.locator('.spot-preview[data-spot="sp_shatin_1"]')))
  check('Selected pin turns blue', (await p.locator('.pin.selected').getAttribute('data-spot')) === 'sp_shatin_1')
  await p.getByRole('button', { name: 'Close preview' }).click()
  check('Close (×) deselects', (await p.locator('.pin.selected').count()) === 0)
  await p.locator('.spot-card[data-spot="sp_taipo_1"]').click()
  check('List card tap selects that spot', await seen(p.locator('.spot-preview[data-spot="sp_taipo_1"]')))
  await p.getByRole('button', { name: 'View details' }).click()
  await p.waitForURL(/#\/app\/spot\/sp_taipo_1$/)
  check('View details opens details', (await seen(p.locator('.carousel'))) && (await seen(p.getByRole('heading', { level: 1, name: /Tai Po/ }))))
  check('Tab bar hidden on details', (await p.locator('.tab-bar').count()) === 0)
  await p.getByRole('button', { name: 'Back' }).first().click()
  await p.waitForURL(/#\/app$/)
  check('Back to map keeps the selection', await seen(p.locator('.spot-preview[data-spot="sp_taipo_1"]')))
  await ctx.close()
}

// 4. Selecting + dragging inside the scaled frame (1280×720)
{
  const { ctx, p } = await driverPage({ viewport: { width: 1280, height: 720 } })
  await p.goto(BASE + '#/app')
  await pins(p).first().waitFor()
  const scale = await p.locator('.device').evaluate((el) => el.getBoundingClientRect().width / el.offsetWidth)
  check('Frame is scaled (< 1)', scale < 1, scale.toFixed(3))
  for (const id of ['sp_shatin_1', 'sp_wanchai_1', 'sp_taipo_1']) {
    // Fresh HK-wide view for each tap (a selection zooms the map in).
    await p.goto('about:blank')
    await p.goto(BASE + '#/app')
    await pins(p).first().waitFor()
    await p.waitForTimeout(500)
    const box = await p.locator(`.pin[data-spot="${id}"]`).boundingBox()
    await p.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
    check(`Framed: tap on ${id} selects it`, await seen(p.locator(`.spot-preview[data-spot="${id}"]`)))
    await p.getByRole('button', { name: 'Close preview' }).click({ timeout: 3000 }).catch(() => {})
    await p.waitForTimeout(800)
  }
  // Drag pans the map by the dragged distance (in layout px = screen px / scale).
  await p.goto('about:blank')
  await p.goto(BASE + '#/app')
  await pins(p).first().waitFor()
  await p.waitForTimeout(500)
  const pin = p.locator('.pin[data-spot="sp_wanchai_1"]')
  const a = await pin.boundingBox()
  const mapBox = await p.locator('.map').boundingBox()
  const sx = mapBox.x + mapBox.width / 2
  const sy = mapBox.y + mapBox.height * 0.4
  await p.mouse.move(sx, sy)
  await p.mouse.down()
  for (let i = 1; i <= 10; i++) await p.mouse.move(sx + 6 * i, sy + 3 * i)
  await p.waitForTimeout(300) // stop before release so Leaflet adds no inertia
  await p.mouse.up()
  await p.waitForTimeout(400)
  const b = await pin.boundingBox()
  const dx = b.x - a.x
  const dy = b.y - a.y
  check('Framed: drag pans the map with the pointer', Math.abs(dx - 60) < 6 && Math.abs(dy - 30) < 6, `moved ${dx.toFixed(1)}, ${dy.toFixed(1)} (expected 60, 30)`)
  await ctx.close()
}

// 5. Sheet snaps (drag + tap), list scrolls without moving the map
{
  const { ctx, p } = await driverPage()
  await p.goto(BASE + '#/app')
  await pins(p).first().waitFor()
  const handle = p.getByRole('button', { name: /Resize sheet/ })
  const h0 = await sheetH(p)
  await handle.click()
  await p.waitForTimeout(400)
  const h1 = await sheetH(p)
  await handle.click()
  await p.waitForTimeout(400)
  const h2 = await sheetH(p)
  await handle.click()
  await p.waitForTimeout(400)
  const h3 = await sheetH(p)
  check('Tap handle: peek → half → full → peek', h0 < h1 && h1 < h2 && h3 === h0, `${h0} ${h1} ${h2} ${h3}`)
  // Drag up from peek to roughly the middle → snaps to half
  const hb = await handle.boundingBox()
  await p.mouse.move(hb.x + hb.width / 2, hb.y + 10)
  await p.mouse.down()
  for (let i = 1; i <= 10; i++) await p.mouse.move(hb.x + hb.width / 2, hb.y + 10 - 22 * i)
  await p.mouse.up()
  await p.waitForTimeout(400)
  check('Drag handle up → snaps to half', (await sheetH(p)) === h1, String(await sheetH(p)))
  // Drag up a lot → full
  const hb2 = await handle.boundingBox()
  await p.mouse.move(hb2.x + hb2.width / 2, hb2.y + 10)
  await p.mouse.down()
  for (let i = 1; i <= 10; i++) await p.mouse.move(hb2.x + hb2.width / 2, hb2.y + 10 - 40 * i)
  await p.mouse.up()
  await p.waitForTimeout(400)
  check('Drag handle further up → snaps to full', (await sheetH(p)) === h2, String(await sheetH(p)))
  // Scroll the list
  const before = await center(p)
  const body = p.locator('.snap-body')
  await body.hover()
  await p.mouse.wheel(0, 400)
  await p.waitForTimeout(300)
  check('List scrolls inside the sheet', (await body.evaluate((el) => el.scrollTop)) > 0)
  check('Scrolling the list does not move the map', (await center(p)) === before)
  // Drag down → peek
  const hb3 = await handle.boundingBox()
  await p.mouse.move(hb3.x + hb3.width / 2, hb3.y + 10)
  await p.mouse.down()
  for (let i = 1; i <= 10; i++) await p.mouse.move(hb3.x + hb3.width / 2, hb3.y + 10 + 60 * i)
  await p.mouse.up()
  await p.waitForTimeout(400)
  check('Drag handle down → snaps to peek', (await sheetH(p)) === h0, String(await sheetH(p)))
  await ctx.close()
}

// 6. Tile failure fallback
{
  const { ctx, p } = await driverPage(undefined, { blockTiles: true })
  await p.goto(BASE + '#/app')
  check('Blocked tiles → fallback banner', await seen(p.getByText('Map unavailable — showing list'), 10000))
  check('Fallback opens sheet to full', (await p.locator('.snap-sheet').getAttribute('data-snap')) === 'full')
  await p.locator('.spot-card[data-spot="sp_kwuntong_1"]').click()
  await p.getByRole('button', { name: 'View details' }).click()
  check('List still works without tiles (details open)', await seen(p.getByRole('heading', { name: /Hoi Bun Road/ })))
  await ctx.close()
}

// 7. Spot details for three spots
{
  const { ctx, p } = await driverPage()
  const cases = [
    { id: 'sp_kwuntong_1', title: /Hoi Bun Road/, sub: 'Kwun Tong · Industrial building', price: 'HK$30', from: '15 min from HK$7.50', charger: 'CCS2 · 50 kW', kind: 'DC fast charging', kwh: '50 kWh', avail: 'Every day 07:00–22:00', reviews: true },
    { id: 'sp_saikung_1', title: /Tai Mong Tsai/, sub: 'Sai Kung · Village house', price: 'HK$25', from: '15 min from HK$6.50', charger: 'Type 2 · 7.4 kW', kind: 'AC charging', kwh: '7 kWh', avail: 'Mon–Fri 08:30–19:00', reviews: true },
    { id: 'sp_saikung_2', title: /Pak Sha Wan/, sub: 'Sai Kung · Village house', price: 'HK$23', from: '15 min from HK$6', charger: 'Type 2 · 7.4 kW', kind: 'AC charging', kwh: '7 kWh', avail: 'Sat–Sun 08:00–20:00', reviews: false },
  ]
  for (const c of cases) {
    await p.goto(BASE + `#/app/spot/${c.id}`)
    const ok =
      (await seen(p.getByRole('heading', { name: c.title }).first())) &&
      (await seen(p.getByText(c.sub))) &&
      (await seen(p.locator('.price-big', { hasText: c.price }))) &&
      (await seen(p.getByText(c.from, { exact: true }))) &&
      (await seen(p.getByText(c.charger).first())) &&
      (await seen(p.getByText(c.kind))) &&
      (await seen(p.getByText(c.kwh))) &&
      (await seen(p.getByText(c.avail))) &&
      (await seen(p.getByText('You get a QR code and a PIN after payment.'))) &&
      (await seen(p.getByText('Wong Mei Ling'))) &&
      (await seen(p.getByText(/Usually replies in minutes/))) &&
      (await seen(p.getByRole('button', { name: 'Request booking' }))) &&
      (await seen(p.locator('.carousel-count', { hasText: '1/' })))
    check(`Details ${c.id}: all blocks with correct data`, ok)
    check(`Details ${c.id}: reviews ${c.reviews ? 'listed' : 'empty state'}`, c.reviews ? (await p.locator('.review-list li').count()) >= 2 : await seen(p.getByText(/No (written )?reviews yet/)))
  }
  await p.goto(BASE + '#/app/spot/sp_kwuntong_1')
  await p.getByRole('button', { name: /54 reviews/ }).click()
  await p.waitForTimeout(600)
  check('Rating link scrolls to reviews', await p.locator('#reviews').evaluate((el) => { const r = el.getBoundingClientRect(); return r.top < window.innerHeight && r.bottom > 0 }))
  await p.getByRole('button', { name: 'Request booking' }).click()
  // S4 replaced the placeholder sheet with the real booking sheet.
  check('Request booking → booking sheet', await seen(p.getByRole('dialog', { name: 'Request booking' })))
  await p.goto(BASE + '#/app/spot/nope')
  check('Unknown id → "no longer listed"', await seen(p.getByText('This charger is no longer listed')))
  await p.getByRole('button', { name: 'Back to map' }).click()
  check('"Back to map" → #/app', await seen(pins(p).first()))
  await ctx.close()
}

// 8. Guards + tab bar
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const p = await ctx.newPage()
  await p.goto(BASE + '#/app')
  check('Guard: signed out /app → #/login', await seen(p.getByRole('heading', { name: 'Log in' })) && p.url().endsWith('#/login'))
  await p.goto(BASE + '#/owner')
  check('Guard: signed out /owner → #/login', await seen(p.getByRole('heading', { name: 'Log in' })) && p.url().endsWith('#/login'))
  await p.evaluate(() => sessionStorage.setItem('pp.session.main', 'u_owner_demo'))
  await p.goto('about:blank')
  await p.goto(BASE + '#/app/account')
  check('Guard: owner on /app → #/owner', await seen(p.getByRole('heading', { name: 'Hi, Mei Ling' })) && p.url().endsWith('#/owner'))
  await p.evaluate(() => sessionStorage.setItem('pp.session.main', 'u_driver_demo'))
  await p.goto('about:blank')
  await p.goto(BASE + '#/owner')
  await p.waitForTimeout(500)
  check('Guard: driver on /owner → #/app', p.url().endsWith('#/app'))
  await p.getByRole('button', { name: 'Bookings' }).click()
  check('Tab bar → Bookings empty state', await seen(p.getByText('No bookings yet')))
  await p.getByRole('button', { name: 'Account' }).click()
  check('Tab bar → Account shows driver data', await seen(p.getByText('driver@plugpark.demo')) && (await seen(p.getByText('Tesla Model Y'))) && (await seen(p.getByText('+852 9123 4567'))))
  await p.getByRole('button', { name: 'Payment methods' }).click()
  check('Payment methods → Demo only sheet', await seen(p.getByRole('dialog', { name: 'Payment methods' })))
  await p.getByRole('button', { name: 'Got it' }).click()
  await p.getByRole('button', { name: 'Explore' }).click()
  check('Tab bar → Explore map', await seen(pins(p).first()))
  await p.getByRole('button', { name: 'Account' }).click()
  await p.getByRole('button', { name: 'Sign out' }).click()
  check('Account sign out → landing', await seen(p.getByText('Charge where')))
  await ctx.close()
}

// 9. RF-4: every matching pin is fully inside the visible map area (below the top overlay, above the sheet)
{
  // Runs in the page (or an iframe): how many pins are fully visible, out of how many, and the zoom-independent details.
  const pinReport = (frame) => frame.evaluate(() => {
    const r = (el) => el.getBoundingClientRect()
    const map = r(document.querySelector('.map'))
    const top = r(document.querySelector('.map-top'))
    const sheet = r(document.querySelector('.snap-sheet'))
    // The last 18px of .map-top is a transparent fade, not chrome.
    const scale = map.width / document.querySelector('.map').offsetWidth
    const area = { left: map.left, right: map.right, top: top.bottom - 18 * scale, bottom: sheet.top }
    const all = [...document.querySelectorAll('.pin')]
    const bad = all.filter((el) => {
      const b = r(el)
      return b.left < area.left || b.right > area.right || b.top < area.top || b.bottom > area.bottom
    })
    return { total: all.length, inside: all.length - bad.length, bad: bad.map((el) => el.dataset.spot) }
  })
  const fits = async (frame, n) => {
    const rep = await pinReport(frame)
    return [rep.total === n && rep.inside === n, `${rep.inside}/${rep.total} inside${rep.bad.length ? ' — clipped: ' + rep.bad.join(',') : ''}`]
  }
  const { ctx, p } = await driverPage()
  await p.goto(BASE + '#/app')
  await pins(p).first().waitFor()
  await p.waitForTimeout(600)
  check('RF-4 on load: all 12 pins fully visible', ...(await fits(p, 12)))
  await chip(p, 'Type 2').click()
  await p.waitForTimeout(1000)
  check('RF-4 Type 2 filter: all 6 pins fully visible', ...(await fits(p, 6)))
  await chip(p, 'All').click()
  await chip(p, 'GB/T').click()
  await p.waitForTimeout(1000)
  check('RF-4 single result: pin visible', ...(await fits(p, 1)))
  const zoom = await p.evaluate(() => Math.max(...[...document.querySelectorAll('.leaflet-tile')].map((t) => Number(((t.getAttribute('src') ?? '').match(/\/(\d+)\/\d+\/\d+\.png/) ?? [])[1]))))
  check('RF-4 single result: zoom capped at 15', zoom === 15, `tile zoom ${zoom}`)
  await chip(p, 'All').click()
  await p.waitForTimeout(1000)
  check('RF-4 filter cleared: all 12 fully visible again', ...(await fits(p, 12)))
  await p.getByRole('button', { name: /Where do you need to charge/ }).click()
  await p.getByRole('dialog', { name: 'Choose a district' }).getByRole('button', { name: /Sai Kung/ }).click()
  await p.waitForTimeout(1200)
  check('RF-4 district Sai Kung: both pins fully visible', ...(await fits(p, 2)))
  await p.getByRole('button', { name: 'Clear district', exact: true }).click()
  await p.waitForTimeout(1200)
  check('RF-4 district cleared: all 12 fully visible', ...(await fits(p, 12)))
  // Reset demo → sign in again → fresh map
  await p.evaluate(() => { localStorage.removeItem('pp.db') })
  await p.goto('about:blank')
  await p.goto(BASE + '#/app')
  await pins(p).first().waitFor()
  await p.waitForTimeout(600)
  check('RF-4 after re-seed: all 12 fully visible', ...(await fits(p, 12)))
  await ctx.close()

  // Presenter view at 1280×720: the driver phone is an iframe.
  const pc = await browser.newContext({ viewport: { width: 1280, height: 720 } })
  const P = await pc.newPage()
  P.on('pageerror', (e) => errors.push(e.message))
  await P.goto(BASE + '#/presenter')
  const d = P.frameLocator('iframe[name="driver"]')
  await d.locator('.pin').first().waitFor({ timeout: 15000 })
  await P.waitForTimeout(800)
  const frame = P.frames().find((f) => f.name() === 'driver')
  check('RF-4 presenter view: all 12 pins fully visible', ...(await fits(frame, 12)))
  await pc.close()
}

await browser.close()
if (errors.length) results.push('FAIL  console/page errors: ' + [...new Set(errors)].join(' | '))
console.log(results.join('\n'))
console.log(`\n${results.filter((r) => r.startsWith('PASS')).length}/${results.length} passed`)
process.exit(results.some((r) => r.startsWith('FAIL')) ? 1 : 0)
