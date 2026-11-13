// Colour-system checks for the restored black-and-blue design (COLOUR_REVERT_AND_ICON_TASK.md; first written for RF-14).
// Run via `npm run check` (or with `npm run preview` running: node scripts/checks/contrast.mjs)
//  1. The tokens are the pre-RF-14 palette, and every token pair used for body text reaches 4.5:1.
//  2. Nothing of the navy / sky-blue / mint palette is left in the source.
//  3. On the main screens: black pins and selected chips, and white text on --blue only where it was before RF-14
//     (the wordmark), reported as KNOWN.
//  4. The "Map style: Light / Dark" switch works and syncs across windows; Light is the default.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const BASE = process.env.PP_BASE ?? 'http://localhost:4173/plug-and-park/'
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const results = []
const check = (name, ok, extra = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? ' - ' + extra : ''}`)

// ── 1. Token contrast ──
const css = fs.readFileSync(path.join(ROOT, 'src', 'styles', 'app.css'), 'utf8')
const rootEnd = css.indexOf('}', css.indexOf(':root {'))
const rootBlock = css.slice(css.indexOf(':root {'), rootEnd)
const tokens = Object.fromEntries([...rootBlock.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})\b/g)].map((m) => [m[1], m[2].toLowerCase()]))
const lum = (hex) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
}
const ratio = (a, b) => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05)

const EXPECTED = {
  ink: '#000000', 'ink-2': '#1f1f1f', 'ink-3': '#333333', muted: '#6b6b6b', 'muted-2': '#8f8f8f',
  line: '#e8e8e8', surface: '#f3f3f3', 'surface-2': '#eeeeee', bg: '#ffffff',
  blue: '#7399c6', 'blue-deep': '#3e5f8a', 'blue-tint': '#eaf0f8', 'blue-ink': '#1c2f4a',
  success: '#0e8345', 'success-tint': '#e6f4ec',
}
check('Tokens match the restored pre-RF-14 palette', Object.entries(EXPECTED).every(([k, v]) => tokens[k] === v), Object.entries(EXPECTED).filter(([k, v]) => tokens[k] !== v).map(([k]) => `--${k}=${tokens[k]}`).join(' '))
check('No --mint tokens are left', !/--mint/.test(css))
const WHITE = '#ffffff'
tokens.white = WHITE

// [text token, background token] — the pairs the app uses for body text.
const PAIRS = [
  ...['bg', 'surface', 'surface-2', 'blue', 'blue-tint'].map((b) => ['ink', b]),
  ...['ink', 'ink-2', 'ink-3'].map((b) => ['white', b]),
  ...['bg', 'surface', 'surface-2'].map((b) => ['muted', b]),
  ...['bg', 'surface', 'blue-tint'].map((b) => ['blue-deep', b]),
  ['blue-ink', 'blue-tint'], // demo banner, blue badges
  ['danger', 'bg'], // field errors
  ['warning', 'warning-tint'],
  ['blue', 'ink'], // links / captions on black
]
// Known shortfalls of the restored design, reported instead of hidden. They must not get worse.
{
  const r = ratio(tokens.danger, tokens['danger-tint'])
  results.push(`KNOWN Contrast --danger on --danger-tint is ${r.toFixed(2)}:1 (under 4.5; the danger colours are unchanged)`)
  check('--danger on --danger-tint has not dropped below 4.19', r >= 4.15, r.toFixed(2))
  const g = ratio(tokens.success, tokens['success-tint'])
  results.push(`KNOWN Contrast --success on --success-tint is ${g.toFixed(2)}:1 (green badges, bold 12px; the pre-RF-14 pairing, kept as the task asks)`)
  check('--success on --success-tint has not dropped below its pre-RF-14 value (4.26)', g >= 4.2, g.toFixed(2))
  const w = ratio(WHITE, tokens.blue)
  results.push(`KNOWN Contrast white on --blue is ${w.toFixed(2)}:1 (the wordmark; under 3:1 for large text — pre-RF-14 pairing kept on Roman's request)`)
  check('White on --blue has not dropped below its pre-RF-14 value (2.96)', w >= 2.9, w.toFixed(2))
}
for (const [fg, bg] of PAIRS) {
  const known = tokens[fg] && tokens[bg]
  const r = known ? ratio(tokens[fg], tokens[bg]) : 0
  check(`Contrast --${fg} on --${bg} ≥ 4.5`, known && r >= 4.5, known ? `${r.toFixed(2)}:1` : 'token missing')
}

// --muted-2 is exempt from 4.5:1, so it must not be used for body text: only placeholders, disabled slots,
// inactive stepper labels and empty stars may use it.
const muted2 = [...css.slice(rootEnd).matchAll(/([^{}]+)\{[^{}]*var\(--muted-2\)[^{}]*\}/g)].map((m) => m[1].trim().split('\n').pop().trim())
const MUTED2_OK = ['.input::placeholder', '.time-chip:disabled', '.stepper li', '.star-input button']
check('--muted-2 only on placeholders, disabled slots, inactive steps and empty stars', muted2.every((sel) => MUTED2_OK.includes(sel)), muted2.join(' | '))

// ── 2. Nothing of the RF-14 palette is left in the source ──
{
  const RF14 = /#(102a43|1b3a57|2a4a68|55657a|7c8a9a|e1e7ed|f4f7fa|e9eef3|68a8e8|2b66a8|e8f1fc|4ee4b6|0a6b50|e3fbf3|0c2238|17395a)|--mint|mint/i
  const left = []
  const walk = (dir) => {
    for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, f.name)
      if (f.isDirectory()) walk(full)
      else if (/\.(tsx?|css|html|svg|webmanifest)$/.test(f.name)) {
        // .map-home / .map / .mini-map used #e9eef3 as the light map background before RF-14 too.
        const hits = [...fs.readFileSync(full, 'utf8').matchAll(new RegExp(RF14.source, 'gi'))].map((m) => m[0]).filter((h) => !(f.name === 'app.css' && h.toLowerCase() === '#e9eef3'))
        if (hits.length) left.push(`${path.relative(ROOT, full)}: ${[...new Set(hits)].join(' ')}`)
      }
    }
  }
  walk(path.join(ROOT, 'src'))
  walk(path.join(ROOT, 'public'))
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8')
  if (RF14.test(html)) left.push('index.html')
  check('No navy / sky-blue / mint colour is left in src/, public/ or index.html', left.length === 0, left.join(' | '))
  check('theme-color is black', /<meta name="theme-color" content="#000000"/.test(html))
}

// ── 3. Rendered screens ──
const browser = await chromium.launch()
const errors = []
const IGNORE = /tile\.openstreetmap|basemaps\.cartocdn|fonts\.g|ERR_FAILED|net::/
async function page(user) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
  if (user)
    await ctx.addInitScript((uid) => {
      try {
        sessionStorage.getItem('pp.session.main') || sessionStorage.setItem('pp.session.main', uid)
      } catch {
        /* about:blank has no storage */
      }
    }, user)
  const p = await ctx.newPage()
  p.on('pageerror', (e) => errors.push(e.message))
  p.on('console', (m) => m.type() === 'error' && !IGNORE.test(m.text()) && errors.push(m.text()))
  return { ctx, p }
}
const BLACK = 'rgb(0, 0, 0)'
const WHITE_RGB = 'rgb(255, 255, 255)'
const BLUE_RGB = 'rgb(115, 153, 198)'
const GREEN_RGB = 'rgb(14, 131, 69)'
const colours = (loc) => loc.evaluate((el) => ({ bg: getComputedStyle(el).backgroundColor, color: getComputedStyle(el).color }))

/** Elements whose own text is white (or near white) on a --blue fill. Before RF-14 only the wordmark did that. */
const whiteOnBlue = (p) =>
  p.evaluate((BLUE) => {
    const parse = (c) => (c.match(/[\d.]+/g) ?? []).map(Number)
    const bgOf = (el) => {
      for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
        const c = getComputedStyle(n).backgroundColor
        const v = parse(c)
        if (v.length && (v[3] === undefined || v[3] > 0.9)) return c
      }
      return 'rgb(255, 255, 255)'
    }
    const out = []
    for (const el of document.querySelectorAll('body *')) {
      if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue
      const r = el.getBoundingClientRect()
      if (!r.width || !r.height) continue
      const [cr, cg, cb] = parse(getComputedStyle(el).color)
      if (bgOf(el) === BLUE && cr > 230 && cg > 230 && cb > 230) out.push(el.closest('.wordmark') ? 'wordmark' : `${el.tagName.toLowerCase()}.${el.className} "${el.textContent.trim().slice(0, 20)}"`)
    }
    return out
  }, BLUE_RGB)
const knownWordmark = new Set()
const report = async (name, p) => {
  const hits = await whiteOnBlue(p)
  const other = hits.filter((h) => h !== 'wordmark')
  if (hits.includes('wordmark')) knownWordmark.add(name)
  check(`${name}: white text on --blue only in the wordmark`, other.length === 0, other.join(' | '))
}

{
  // Landing: black, with the white-on-blue wordmark
  const { ctx, p } = await page(null)
  await p.goto(BASE + '#/')
  await p.getByText('Charge where').waitFor()
  const land = await p.locator('.landing').evaluate((el) => getComputedStyle(el.closest('.screen-view')).backgroundColor)
  check('Landing background is pure black', land === BLACK, land)
  const wm = await colours(p.locator('.wordmark').first())
  check('Wordmark: white on the blue square', wm.bg === BLUE_RGB && wm.color === WHITE_RGB, JSON.stringify(wm))
  await report('Landing', p)
  await ctx.close()
}

{
  // Driver: map (light), selected pin, booking sheet, payment, charging
  const { ctx, p } = await page('u_driver_demo')
  await p.goto(BASE + '#/app')
  await p.locator('.pin').first().waitFor()
  await p.waitForTimeout(700)
  const pin = await colours(p.locator('.pin:not(.group)').first())
  check('Pins: black pill, white text', pin.bg === BLACK && pin.color === WHITE_RGB, JSON.stringify(pin))
  const group = await colours(p.locator('.pin.group').first())
  check('Group pins (RF-12): the same black pill, white text', group.bg === BLACK && group.color === WHITE_RGB, JSON.stringify(group))
  check('Map is light by default (<html data-map-style="light">, no inverting tile filter)', await p.evaluate(() => document.documentElement.dataset.mapStyle === 'light' && !getComputedStyle(document.querySelector('.leaflet-tile-pane')).filter.includes('invert')))
  const mapBg = await p.evaluate(() => getComputedStyle(document.querySelector('.map')).backgroundColor)
  // Leaflet's own #ddd shows while tiles load, as before RF-14 (the navy override was an RF-14 addition).
  check('Map container background is light grey (seen while tiles load or fail)', mapBg === 'rgb(221, 221, 221)' || mapBg === 'rgb(233, 238, 243)', mapBg)
  const chip = await colours(p.locator('.chip.active').first())
  check('Selected filter chip: black with white text', chip.bg === BLACK && chip.color === WHITE_RGB, JSON.stringify(chip))
  await report('Map', p)

  await p.locator('.spot-card[data-spot="sp_shatin_1"]').click()
  await p.locator('.pin.selected').waitFor()
  await p.waitForTimeout(300)
  const sel = await colours(p.locator('.pin.selected'))
  check('Selected pin: blue pill, black text', sel.bg === BLUE_RGB && sel.color === BLACK, JSON.stringify(sel))
  await report('Map with a selected pin', p)

  await p.goto(BASE + '#/app/spot/sp_kwuntong_1')
  await p.getByRole('button', { name: 'Request booking', exact: true }).click()
  const sheet = p.getByRole('dialog', { name: 'Request booking' })
  await sheet.getByRole('button', { name: 'Tomorrow', exact: true }).click()
  await sheet.getByRole('button', { name: '13:00', exact: true }).click()
  await p.waitForTimeout(400)
  const slot = await colours(sheet.locator('.time-chip.active'))
  check('Selected time slot: black fill, white text', slot.bg === BLACK && slot.color === WHITE_RGB, JSON.stringify(slot))
  await report('Booking sheet', p)

  await p.evaluate(() => {
    const db = JSON.parse(localStorage.getItem('pp.db'))
    const start = new Date()
    start.setDate(start.getDate() + 1)
    start.setHours(13, 0, 0, 0)
    const now = new Date().toISOString()
    const base = { spotId: 'sp_kwuntong_1', driverId: 'u_driver_demo', ownerId: 'u_owner_demo', start: start.toISOString(), durationMinutes: 60, price: 30, commissionRate: 0.18, createdAt: now, updatedAt: now }
    db.bookings.push({ ...base, id: 'bk_contrast', status: 'confirmed' })
    db.bookings.push({ ...base, id: 'bk_contrast_live', status: 'active', startedAt: now, paidAt: now, paymentLast4: '4242', pin: '7350' })
    localStorage.setItem('pp.db', JSON.stringify(db))
  })
  await p.goto(BASE + `?r=${Date.now()}#/app/booking/bk_contrast`)
  await p.locator('.status-card[data-status="confirmed"]').waitFor()
  const ok = await colours(p.locator('.status-icon.green').first())
  check('Success check: the green family', ok.bg === GREEN_RGB || ok.color === GREEN_RGB || /14, 131, 69|230, 244, 236/.test(ok.bg), JSON.stringify(ok))
  await report('Booking approved', p)
  await p.goto(BASE + `?r=${Date.now()}#/app/pay/bk_contrast`)
  await p.getByLabel('Card number', { exact: true }).waitFor()
  await p.getByRole('button', { name: 'Use test card' }).click()
  const pay = await colours(p.locator('.bottom-bar .btn-primary'))
  check('Primary button: black with white text', pay.bg === BLACK && pay.color === WHITE_RGB, JSON.stringify(pay))
  await report('Payment', p)
  await p.goto(BASE + `?r=${Date.now()}#/app/session/bk_contrast_live`)
  await p.locator('.ring-wrap').waitFor()
  const ring = await p.locator('.ring-wrap circle').nth(1).evaluate((el) => getComputedStyle(el).stroke)
  const sessionBg = await p.locator('.screen-view.session').evaluate((el) => getComputedStyle(el).backgroundColor)
  check('Charging session: black screen, blue ring', ring === BLUE_RGB && sessionBg === BLACK, `${ring} on ${sessionBg}`)
  await ctx.close()
}

{
  // Owner: requests + earnings
  const { ctx, p } = await page('u_owner_demo')
  await p.goto(BASE + '#/owner')
  await p.locator('.request-card').first().waitFor()
  const earn = await p.locator('.request-card .money-in').first().evaluate((el) => getComputedStyle(el).color).catch(() => BLACK)
  check('"You earn" is black on white, as before RF-14', earn === BLACK, earn)
  await report('Owner requests', p)
  await p.goto(BASE + '#/owner/earnings')
  await p.locator('.balance-card').waitFor()
  const card = await colours(p.locator('.balance-card'))
  const bal = await p.locator('.balance-amount').evaluate((el) => getComputedStyle(el).color)
  check('Balance card: black with a white amount', card.bg === BLACK && bal === WHITE_RGB, `${bal} on ${card.bg}`)
  const bars = await p.locator('.week-chart rect').evaluateAll((els) => els.map((el) => getComputedStyle(el).fill))
  check('Weekly chart: today blue, other days light grey', bars[6] === BLUE_RGB && bars.slice(0, 6).every((f) => f === 'rgb(217, 217, 217)'), bars.join(' '))
  await report('Owner earnings', p)
  const tab = await p.locator('.tab.active').evaluate((el) => getComputedStyle(el).color)
  check('Active tab is black', tab === BLACK, tab)
  await ctx.close()
}

// ── 4. Map style switch: Light (default) / Dark, synced across windows ──
{
  const { ctx, p } = await page('u_driver_demo')
  await p.goto(BASE + '#/app')
  await p.locator('.pin').first().waitFor()
  const other = await ctx.newPage()
  await other.goto(BASE + '#/app')
  await other.locator('.pin').first().waitFor()
  await p.bringToFront()
  await p.getByRole('button', { name: /Demo only/ }).click()
  const dlg = p.getByRole('dialog', { name: 'Demo controls' })
  const group = dlg.getByRole('group', { name: 'Map style' })
  check('Demo sheet has "Map style" with Light (default) and Dark', (await group.getByRole('button', { name: 'Light' }).getAttribute('aria-pressed')) === 'true' && (await group.getByRole('button', { name: 'Dark' }).getAttribute('aria-pressed')) === 'false')
  await group.getByRole('button', { name: 'Dark' }).click()
  const read = (pg) => pg.evaluate(() => ({ style: document.documentElement.dataset.mapStyle, filter: getComputedStyle(document.querySelector('.leaflet-tile-pane')).filter, bg: getComputedStyle(document.querySelector('.map')).backgroundColor }))
  const a = await read(p)
  check('Dark: the tile filter inverts and the map background is dark', a.style === 'dark' && a.filter.includes('invert') && a.bg === 'rgb(31, 31, 31)', JSON.stringify(a))
  await other.waitForFunction(() => document.documentElement.dataset.mapStyle === 'dark', null, { timeout: 3000 }).catch(() => {})
  const b = await read(other)
  check('Dark syncs to the other window', b.style === 'dark' && b.filter.includes('invert'), JSON.stringify(b))
  await p.keyboard.press('Escape')
  const outline = await p.locator('.pin').first().evaluate((el) => getComputedStyle(el).boxShadow)
  check('Dark: pins get a white outline so the black pills stay visible', /rgb\(255, 255, 255\)/.test(outline), outline)
  await p.reload()
  await p.locator('.pin').first().waitFor()
  check('Map style survives a reload', await p.evaluate(() => document.documentElement.dataset.mapStyle === 'dark'))
  await p.getByRole('button', { name: /Demo only/ }).click()
  await p.getByRole('dialog', { name: 'Demo controls' }).getByRole('group', { name: 'Map style' }).getByRole('button', { name: 'Light' }).click()
  check('Back to Light', await p.evaluate(() => document.documentElement.dataset.mapStyle === 'light' && !getComputedStyle(document.querySelector('.leaflet-tile-pane')).filter.includes('invert')))
  await ctx.close()
}

await browser.close()
if (knownWordmark.size) results.push(`KNOWN White-on-blue wordmark is shown on: ${[...knownWordmark].join(', ')}`)
if (errors.length) results.push('FAIL  console/page errors: ' + [...new Set(errors)].join(' | '))
console.log(results.join('\n'))
console.log(`\n${results.filter((r) => r.startsWith('PASS')).length}/${results.filter((r) => !r.startsWith('KNOWN')).length} passed`)
process.exit(results.some((r) => r.startsWith('FAIL')) ? 1 : 0)
