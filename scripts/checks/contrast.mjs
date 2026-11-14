// RF-14 colour-system checks. Run via `npm run check` (or with `npm run preview` running: node scripts/checks/contrast.mjs)
//  1. WCAG contrast of every token pair used for text (read from :root in src/styles/app.css) is at least 4.5:1.
//  2. No hard-coded hex colours in app.css outside the token block.
//  3. On the main screens nothing renders white text on --blue or --mint, and nothing uses --blue or --mint
//     as text on a light background.
//  4. The "Map style: Dark / Light" switch works and syncs across windows.
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

const EXPECTED = { ink: '#102a43', blue: '#68a8e8', 'blue-deep': '#2b66a8', mint: '#4ee4b6', 'mint-deep': '#0a6b50', muted: '#55657a', bg: '#ffffff' }
check('Tokens match the RF-14 palette', Object.entries(EXPECTED).every(([k, v]) => tokens[k] === v), Object.entries(EXPECTED).filter(([k, v]) => tokens[k] !== v).map(([k]) => `--${k}=${tokens[k]}`).join(' '))

// [text token, background token] — every pair the app uses for text.
const PAIRS = [
  ...['bg', 'surface', 'surface-2', 'blue', 'mint', 'blue-tint', 'mint-tint'].map((b) => ['ink', b]),
  ...['ink', 'ink-2', 'ink-3'].map((b) => ['on-ink', b]),
  ...['bg', 'surface', 'surface-2'].map((b) => ['muted', b]),
  ...['bg', 'surface', 'blue-tint'].map((b) => ['blue-deep', b]),
  ...['bg', 'surface', 'mint-tint'].map((b) => ['mint-deep', b]),
  ['success', 'success-tint'],
  ['danger', 'bg'], // field errors
  ['warning', 'warning-tint'],
  ['mint', 'ink'], // live accents on navy
  ['blue', 'ink'], // links / captions on navy
  ['on-ink-muted', 'ink'],
]
// Known shortfall, reported instead of hidden: RF-14 says "don't change the danger colours", and --danger on
// --danger-tint (declined banner, red badge; bold text) is 4.19:1. It must not get worse.
{
  const r = ratio(tokens.danger, tokens['danger-tint'])
  results.push(`KNOWN Contrast --danger on --danger-tint is ${r.toFixed(2)}:1 (under 4.5; colours frozen by RF-14, see the report)`)
  check('--danger on --danger-tint has not dropped below its RF-14 value (4.19)', r >= 4.15, r.toFixed(2))
}
for (const [fg, bg] of PAIRS) {
  const known = tokens[fg] && tokens[bg]
  const r = known ? ratio(tokens[fg], tokens[bg]) : 0
  check(`Contrast --${fg} on --${bg} ≥ 4.5`, known && r >= 4.5, known ? `${r.toFixed(2)}:1` : 'token missing')
}
// The two forbidden uses really are unreadable (so the rule is worth enforcing).
check('White on --blue / --mint would fail (never used)', ratio('#ffffff', tokens.blue) < 4.5 && ratio('#ffffff', tokens.mint) < 4.5)

// --muted-2 is exempt from 4.5:1, so it must not be used for body text: only placeholders, disabled slots,
// inactive stepper labels and empty stars may use it.
const muted2 = [...css.slice(rootEnd).matchAll(/([^{}]+)\{[^{}]*var\(--muted-2\)[^{}]*\}/g)].map((m) => m[1].trim().split('\n').pop().trim())
const MUTED2_OK = ['.input::placeholder', '.time-chip:disabled', '.stepper li', '.star-input button']
check('--muted-2 only on placeholders, disabled slots, inactive steps and empty stars', muted2.every((sel) => MUTED2_OK.includes(sel)), muted2.join(' | '))

// ── 2. No hard-coded colours outside the token block ──
const body = css.slice(rootEnd)
const hex = body.match(/#[0-9a-fA-F]{3,8}\b/g) ?? []
check('app.css: no hex colours outside :root', hex.length === 0, hex.join(' '))
const fills = [...body.matchAll(/(background(?:-color)?|color|border(?:-[a-z]+)*|fill|stroke|outline):[^;]*rgba?\([^)]*\)/g)].map((m) => m[0])
check('app.css: rgba() literals only in shadows', fills.length === 0, fills.join(' | '))

// NAVY_RESTORE: nothing of the black-and-blue palette (v1.3-demo) may come back.
{
  const BLACK_BLUE = [/#7399c6/i, /#3e5f8a/i, /#eaf0f8/i, /#1c2f4a/i, /--ink:\s*#000000/i, /--success:\s*#0e8345/i]
  const files = []
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name)
      if (e.isDirectory()) walk(full)
      else if (/\.(css|tsx?|html|svg|json|webmanifest)$/i.test(e.name)) files.push(full)
    }
  }
  walk(path.join(ROOT, 'src'))
  walk(path.join(ROOT, 'public'))
  files.push(path.join(ROOT, 'index.html'))
  const left = []
  for (const f of files) {
    const text = fs.readFileSync(f, 'utf8')
    for (const re of BLACK_BLUE) if (re.test(text)) left.push(`${path.relative(ROOT, f)}: ${re.source}`)
  }
  check('No black-and-blue token (#7399c6, --ink: #000000, …) is left in src/, public/ or index.html', left.length === 0, left.join(' | '))
  check('index.html theme-color is navy', /<meta name="theme-color" content="#102A43"/i.test(fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8')))
}

// ── 3. Rendered screens ──
const browser = await chromium.launch()
const errors = []
const IGNORE = /tile\.openstreetmap|basemaps\.cartocdn|fonts\.g|ERR_FAILED|net::/
async function page(user) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
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

/** Every visible element with its own text: text colour vs the nearest opaque background behind it. */
const audit = (p) =>
  p.evaluate(() => {
    const css = getComputedStyle(document.documentElement)
    const probe = document.createElement('span')
    document.body.appendChild(probe)
    const rgb = (name) => {
      probe.style.color = css.getPropertyValue(name).trim()
      return getComputedStyle(probe).color
    }
    const BLUE = rgb('--blue')
    const MINT = rgb('--mint')
    probe.remove()
    const parse = (c) => (c.match(/[\d.]+/g) ?? []).map(Number)
    const lum = ([r, g, b]) => {
      const f = (v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
    }
    const bgOf = (el) => {
      for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
        const c = getComputedStyle(n).backgroundColor
        const v = parse(c)
        if (v.length && (v[3] === undefined || v[3] > 0.9)) return c
      }
      return 'rgb(255, 255, 255)'
    }
    const out = { whiteOnAccent: [], accentOnLight: [], accentFills: 0, texts: 0 }
    for (const el of document.querySelectorAll('body *')) {
      const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())
      const svgIcon = el.tagName === 'svg'
      if (!own && !svgIcon) continue
      const r = el.getBoundingClientRect()
      if (!r.width || !r.height) continue
      const st = getComputedStyle(el)
      if (st.visibility === 'hidden' || st.display === 'none') continue
      const color = st.color
      const bg = bgOf(el)
      const label = `${el.tagName.toLowerCase()}.${String(el.className.baseVal ?? el.className).split(' ').filter(Boolean).join('.')} "${(el.textContent ?? '').trim().slice(0, 24)}"`
      out.texts++
      if (bg === BLUE || bg === MINT) {
        out.accentFills++
        if (lum(parse(color)) > 0.6) out.whiteOnAccent.push(label)
      }
      if ((color === BLUE || color === MINT) && lum(parse(bg)) > 0.5) out.accentOnLight.push(label)
    }
    return out
  })

const report = async (name, p, { expectAccent = true } = {}) => {
  const a = await audit(p)
  check(`${name}: no white text on --blue / --mint`, a.whiteOnAccent.length === 0 && (!expectAccent || a.accentFills > 0), a.whiteOnAccent.join(' | ') || `${a.accentFills} accent fills, ${a.texts} text nodes`)
  check(`${name}: no --blue / --mint text on a light background`, a.accentOnLight.length === 0, a.accentOnLight.join(' | '))
}

{
  // Driver: map (dark), selected pin, booking sheet, payment
  const { ctx, p } = await page('u_driver_demo')
  await p.goto(BASE + '#/app')
  await p.locator('.pin').first().waitFor()
  await p.waitForTimeout(700)
  const pin = await p.locator('.pin:not(.group)').first().evaluate((el) => {
    const st = getComputedStyle(el)
    const root = getComputedStyle(document.documentElement)
    const probe = document.createElement('span')
    document.body.appendChild(probe)
    const rgb = (v) => ((probe.style.color = root.getPropertyValue(v).trim()), getComputedStyle(probe).color)
    const res = { bgIsMint: st.backgroundColor === rgb('--mint'), textIsInk: st.color === rgb('--ink'), borderIsInk: st.borderTopColor === rgb('--ink') }
    probe.remove()
    return res
  })
  // The 1.5px width is read from the stylesheet: the computed value is snapped to whole device pixels.
  check('Pins: mint pill, navy text, 1.5px navy border', pin.bgIsMint && pin.textIsInk && pin.borderIsInk && /\.pin \{[^}]*border: 1\.5px solid var\(--ink\)/.test(css), JSON.stringify(pin))
  // NAVY_RESTORE: RF-12 group pins share the RF-14 pin style; v1.3-demo's white outline on dark-map pins is gone.
  const group = await p.locator('.pin.group').first().evaluate((el) => ({ bg: getComputedStyle(el).backgroundColor, color: getComputedStyle(el).color, outline: getComputedStyle(el).boxShadow })).catch(() => null)
  check('Group pins (RF-12): the same mint pill with navy text', !!group && group.bg === 'rgb(78, 228, 182)' && group.color === 'rgb(16, 42, 67)', JSON.stringify(group))
  const outline = await p.locator('.pin:not(.group)').first().evaluate((el) => getComputedStyle(el).boxShadow)
  check('Dark map pins have no white outline (removed with the navy restore)', !/rgb\(255, 255, 255\)/.test(outline), outline)
  check('Map is dark by default (<html data-map-style="dark">, inverting tile filter)', await p.evaluate(() => document.documentElement.dataset.mapStyle === 'dark' && getComputedStyle(document.querySelector('.leaflet-tile-pane')).filter.includes('invert')))
  const mapBg = await p.evaluate(() => getComputedStyle(document.querySelector('.map')).backgroundColor)
  check('Map container background is navy (seen while tiles load or fail)', mapBg === 'rgb(16, 42, 67)', mapBg)
  await report('Map', p)

  await p.locator('.spot-card[data-spot="sp_shatin_1"]').click()
  await p.locator('.pin.selected').waitFor()
  const sel = await p.locator('.pin.selected').evaluate((el) => ({ bg: getComputedStyle(el).backgroundColor, color: getComputedStyle(el).color }))
  check('Selected pin: white pill, navy text', sel.bg === 'rgb(255, 255, 255)' && sel.color === 'rgb(16, 42, 67)', JSON.stringify(sel))
  await report('Map with a selected pin', p)

  await p.goto(BASE + '#/app/spot/sp_kwuntong_1')
  await p.getByRole('button', { name: 'Request booking', exact: true }).click()
  const sheet = p.getByRole('dialog', { name: 'Request booking' })
  await sheet.getByRole('button', { name: 'Tomorrow', exact: true }).click()
  await sheet.getByRole('button', { name: '13:00', exact: true }).click()
  await p.waitForTimeout(400)
  const slot = await sheet.locator('.time-chip.active').evaluate((el) => ({ bg: getComputedStyle(el).backgroundColor, color: getComputedStyle(el).color }))
  check('Selected time slot: sky-blue fill, navy text', slot.bg === 'rgb(104, 168, 232)' && slot.color === 'rgb(16, 42, 67)', JSON.stringify(slot))
  await report('Booking sheet', p)

  const id = await p.evaluate(() => {
    const db = JSON.parse(localStorage.getItem('pp.db'))
    const start = new Date()
    start.setDate(start.getDate() + 1)
    start.setHours(13, 0, 0, 0)
    const now = new Date().toISOString()
    db.bookings.push({ id: 'bk_contrast', spotId: 'sp_kwuntong_1', driverId: 'u_driver_demo', ownerId: 'u_owner_demo', start: start.toISOString(), durationMinutes: 60, price: 30, commissionRate: 0.18, status: 'confirmed', createdAt: now, updatedAt: now })
    localStorage.setItem('pp.db', JSON.stringify(db))
    return 'bk_contrast'
  })
  await p.goto(BASE + `?r=${Date.now()}#/app/booking/${id}`)
  await p.locator('.status-card[data-status="confirmed"]').waitFor()
  await report('Booking approved', p)
  await p.goto(BASE + `?r=${Date.now()}#/app/pay/${id}`)
  await p.getByLabel('Card number', { exact: true }).waitFor()
  await p.getByRole('button', { name: 'Use test card' }).click()
  await report('Payment', p, { expectAccent: false })
  await ctx.close()
}

{
  // Owner: requests + earnings (top and breakdown)
  const { ctx, p } = await page('u_owner_demo')
  await p.goto(BASE + '#/owner')
  await p.locator('.request-card').first().waitFor()
  const earn = await p.locator('.request-card .money-in').first().evaluate((el) => getComputedStyle(el).color)
  check('"You earn" is deep mint on white', earn === 'rgb(10, 107, 80)', earn)
  await report('Owner requests', p, { expectAccent: false })
  await p.goto(BASE + '#/owner/earnings')
  await p.locator('.balance-card').waitFor()
  const bal = await p.locator('.balance-amount').evaluate((el) => getComputedStyle(el).color)
  check('Balance amount is mint on the navy card', bal === 'rgb(78, 228, 182)', bal)
  await p.locator('button.tx-main').first().click()
  await p.locator('.breakdown').waitFor()
  const receive = await p.locator('.breakdown .total dd').evaluate((el) => getComputedStyle(el).color)
  check('"You receive" amount is deep mint', receive === 'rgb(10, 107, 80)', receive)
  await report('Owner earnings', p, { expectAccent: false })
  const tab = await p.locator('.tab.active').evaluate((el) => getComputedStyle(el).color)
  check('Active tab is deep blue', tab === 'rgb(43, 102, 168)', tab)
  await ctx.close()
}

// ── 4. Map style switch: Dark / Light, synced across windows ──
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
  check('Demo sheet has "Map style" with Dark (default) and Light', (await group.getByRole('button', { name: 'Dark' }).getAttribute('aria-pressed')) === 'true' && (await group.getByRole('button', { name: 'Light' }).getAttribute('aria-pressed')) === 'false')
  await group.getByRole('button', { name: 'Light' }).click()
  const light = (pg) => pg.evaluate(() => ({ style: document.documentElement.dataset.mapStyle, filter: getComputedStyle(document.querySelector('.leaflet-tile-pane')).filter, bg: getComputedStyle(document.querySelector('.map')).backgroundColor }))
  const a = await light(p)
  check('Light: tile filter no longer inverts, map background is light', a.style === 'light' && !a.filter.includes('invert') && a.bg !== 'rgb(16, 42, 67)', JSON.stringify(a))
  await other.waitForFunction(() => document.documentElement.dataset.mapStyle === 'light', null, { timeout: 3000 }).catch(() => {})
  const b = await light(other)
  check('Light syncs to the other window', b.style === 'light' && !b.filter.includes('invert'), JSON.stringify(b))
  await p.keyboard.press('Escape')
  await report('Map (Light style)', p)
  await p.reload()
  await p.locator('.pin').first().waitFor()
  check('Map style survives a reload', await p.evaluate(() => document.documentElement.dataset.mapStyle === 'light'))
  await p.getByRole('button', { name: /Demo only/ }).click()
  await p.getByRole('dialog', { name: 'Demo controls' }).getByRole('group', { name: 'Map style' }).getByRole('button', { name: 'Dark' }).click()
  check('Back to Dark', await p.evaluate(() => document.documentElement.dataset.mapStyle === 'dark' && getComputedStyle(document.querySelector('.leaflet-tile-pane')).filter.includes('invert')))
  await ctx.close()
}

await browser.close()
if (errors.length) results.push('FAIL  console/page errors: ' + [...new Set(errors)].join(' | '))
console.log(results.join('\n'))
console.log(`\n${results.filter((r) => r.startsWith('PASS')).length}/${results.filter((r) => !r.startsWith('KNOWN')).length} passed`)
process.exit(results.some((r) => r.startsWith('FAIL')) ? 1 : 0)
