// Checks the S8 "done when" items. Run via `npm run check` (or with `npm run preview` running: node scripts/checks/s8.mjs)
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const BASE = process.env.PP_BASE ?? 'http://localhost:4173/plug-and-park/'
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const OUT = path.join(ROOT, 'Claude outputs1', 'screenshots', 'S8')
const results = []
const check = (name, ok, extra = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? ' - ' + extra : ''}`)
const seen = (loc, timeout = 4000) => loc.waitFor({ timeout }).then(() => true, () => false)
const IGNORE = /tile\.openstreetmap|basemaps\.cartocdn|fonts\.g|ERR_FAILED|net::/
const browser = await chromium.launch()
const errors = []
const watch = (p, extraIgnore) => {
  p.on('pageerror', (e) => errors.push(e.message))
  p.on('console', (m) => m.type() === 'error' && !IGNORE.test(m.text()) && !(extraIgnore && extraIgnore.test(m.text())) && errors.push(m.text()))
}
const asDriver = (ctx) => ctx.addInitScript(() => {
  try {
    sessionStorage.getItem('pp.session.main') || sessionStorage.setItem('pp.session.main', 'u_driver_demo')
  } catch {}
})

// ── 1. Web app manifest + icons under the /plug-and-park/ base ──
{
  const html = await (await fetch(BASE)).text()
  check('index.html links the manifest and apple-touch-icon under /plug-and-park/', /href="\/plug-and-park\/manifest\.webmanifest(\?v=\d+)?"/.test(html) && /href="\/plug-and-park\/icons\/apple-touch-icon\.png(\?v=\d+)?"/.test(html)) // ?v= busts the icon cache (new app icon)
  check('iOS standalone meta tags', html.includes('apple-mobile-web-app-capable') && html.includes('apple-mobile-web-app-status-bar-style'))
  const res = await fetch(BASE + 'manifest.webmanifest')
  let m = null
  try {
    m = await res.json()
  } catch {}
  check('Manifest is valid JSON', res.ok && !!m)
  check('Manifest: name, short_name, standalone, black theme/background', m?.name === 'Plug & Park' && !!m?.short_name && m?.display === 'standalone' && m?.theme_color === '#000000' && m?.background_color === '#000000')
  check('Manifest: start_url and scope under /plug-and-park/', m?.start_url?.startsWith('/plug-and-park/') && m?.scope === '/plug-and-park/')
  for (const icon of m?.icons ?? []) {
    const r = await fetch(new URL(icon.src, BASE).href)
    const buf = Buffer.from(await r.arrayBuffer())
    const w = buf.readUInt32BE(16)
    const h = buf.readUInt32BE(20)
    check(`Icon ${icon.sizes} served as a PNG of the right size`, r.ok && r.headers.get('content-type')?.includes('png') && `${w}x${h}` === icon.sizes, `${w}x${h}`)
  }
  check('No service worker registered in the code', !fs.readdirSync(path.join(ROOT, 'src'), { recursive: true }).some((f) => String(f).endsWith('.ts') || String(f).endsWith('.tsx') ? fs.readFileSync(path.join(ROOT, 'src', String(f)), 'utf8').includes('serviceWorker') : false))
}

// ── 2. Performance: the landing page doesn't load Leaflet ──
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const p = await ctx.newPage()
  watch(p)
  const js = []
  p.on('request', (r) => r.url().endsWith('.js') && js.push(r.url()))
  await p.goto(BASE + '#/')
  await p.getByText('Charge where').waitFor()
  await p.waitForTimeout(500)
  const leafletOnLanding = []
  for (const u of js) if ((await (await fetch(u)).text()).includes('leaflet-container')) leafletOnLanding.push(u)
  check('Landing loads no Leaflet code', leafletOnLanding.length === 0, leafletOnLanding.join(','))
  await ctx.close()
}

// ── 3. Photos: empty manifest → illustrations; a manifest photo shows; a broken file falls back ──
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
  await asDriver(ctx)
  const p = await ctx.newPage()
  watch(p)
  await p.goto(BASE + '#/app/spot/sp_kwuntong_1')
  await p.locator('.carousel').waitFor()
  check('Empty manifest → generated illustrations', (await p.locator('.carousel svg.carousel-slide').count()) === 3 && (await p.locator('.carousel img').count()) === 0)
  await ctx.close()

  // Generated placeholder JPEG (never written to public/): served through a route instead.
  const gen = await browser.newPage({ viewport: { width: 600, height: 400 } })
  await gen.setContent('<div style="width:600px;height:400px;background:linear-gradient(135deg,#3e5f8a,#eaf0f8)"></div>')
  const jpeg = await gen.screenshot({ type: 'jpeg', quality: 70 })
  await gen.close()
  const c2 = await browser.newContext({ viewport: { width: 390, height: 844 } })
  await asDriver(c2)
  await c2.route(/photos\/manifest\.json/, (r) => r.fulfill({ contentType: 'application/json', body: JSON.stringify({ sp_kwuntong_1: ['test-1.jpg', 'missing-2.jpg'] }) }))
  await c2.route(/photos\/test-1\.jpg$/, (r) => r.fulfill({ contentType: 'image/jpeg', body: jpeg }))
  await c2.route(/photos\/missing-2\.jpg$/, (r) => r.fulfill({ status: 404, body: '' }))
  const q = await c2.newPage()
  watch(q, /404|Failed to load resource/)
  await q.goto(BASE + '#/app/spot/sp_kwuntong_1')
  const img = q.locator('.carousel img[data-photo="test-1.jpg"]')
  check('Manifest photo shows in slide 1', (await seen(img)) && (await img.evaluate((el) => el.complete && el.naturalWidth === 600)))
  await q.waitForTimeout(800)
  check('Broken photo falls back to the illustration silently', (await q.locator('.carousel img[data-photo="missing-2.jpg"]').count()) === 0 && (await q.locator('.carousel svg.carousel-slide').count()) === 2)
  await q.goto(BASE + '#/app')
  check('Map list thumbnail uses the photo too', await seen(q.locator('.spot-card[data-spot="sp_kwuntong_1"] img[data-photo="test-1.jpg"]')))
  await c2.close()
}

// ── 4. Transitions: never a blank frame (sampled every animation frame) + a video for review ──
{
  fs.mkdirSync(OUT, { recursive: true })
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, recordVideo: { dir: OUT, size: { width: 390, height: 844 } } })
  const p = await ctx.newPage()
  watch(p)
  await p.addInitScript(() => {
    window.__frames = { total: 0, blank: 0, minOpacity: 1 }
    const tick = () => {
      const body = document.querySelector('.app-body')
      if (body) {
        const routes = body.querySelectorAll(':scope > .route')
        window.__frames.total++
        if (routes.length === 0) window.__frames.blank++
        routes.forEach((r) => (window.__frames.minOpacity = Math.min(window.__frames.minOpacity, +getComputedStyle(r).opacity)))
      }
      requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  })
  await p.goto(BASE + '#/')
  await p.getByRole('button', { name: 'I already have an account' }).click()
  await p.getByRole('button', { name: 'Demo driver' }).click()
  await p.getByRole('button', { name: 'Log in', exact: true }).click()
  await p.getByLabel('Digit 1 of 6').waitFor()
  await p.keyboard.type('123456')
  await p.locator('.pin').first().waitFor({ timeout: 8000 })
  await p.locator('.spot-card[data-spot="sp_kwuntong_1"]').click()
  await p.getByRole('button', { name: 'View details' }).click()
  await p.locator('.carousel').waitFor()
  await p.getByRole('button', { name: 'Back' }).first().click()
  await p.locator('.pin').first().waitFor()
  await p.getByRole('button', { name: 'Bookings' }).click()
  await p.getByRole('button', { name: 'Account' }).click()
  await p.getByRole('button', { name: 'Explore' }).click()
  await p.locator('.pin').first().waitFor()
  await p.waitForTimeout(400)
  const f = await p.evaluate(() => window.__frames)
  check('Transitions: no blank frame across the main flow', f.blank === 0 && f.total > 30, JSON.stringify(f))
  check('Transitions: screens never drop below 50% opacity', f.minOpacity >= 0.5, String(f.minOpacity))
  const video = await p.video().path()
  await ctx.close()
  const target = path.join(OUT, 'main-flow.webm')
  try {
    fs.renameSync(video, target)
  } catch {}
  check('Main-flow video recorded for review', fs.existsSync(target))
}

// ── 5. Accessibility basics ──
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const p = await ctx.newPage()
  watch(p)
  await p.goto(BASE + '#/')
  const banner = p.getByRole('button', { name: /Demo only/ })
  await banner.focus()
  await p.keyboard.press('Enter')
  const dlg = p.getByRole('dialog', { name: 'Demo controls' })
  await dlg.waitFor()
  await p.waitForTimeout(100)
  let inside = true
  for (let i = 0; i < 25; i++) {
    await p.keyboard.press('Tab')
    inside = inside && (await p.evaluate(() => !!document.activeElement?.closest('[role="dialog"]')))
  }
  check('Sheet traps focus (25 × Tab stays inside)', inside)
  await p.keyboard.press('Escape')
  check('Escape closes the sheet and focus returns to the opener', (await dlg.count()) === 0 && (await p.evaluate(() => document.activeElement?.classList.contains('demo-banner'))))
  // Icon-only buttons have names
  await p.goto(BASE + '#/login')
  const unnamed = await p.evaluate(() => [...document.querySelectorAll('button')].filter((b) => !b.textContent.trim() && !b.getAttribute('aria-label')).length)
  check('Every icon-only button has an aria-label (login)', unnamed === 0)
  // Inputs are labelled and errors tied with aria-describedby
  await p.getByLabel('Email').fill('x')
  await p.getByLabel('Email').blur()
  const tied = await p.getByLabel('Email').evaluate((el) => {
    const id = el.getAttribute('aria-describedby')
    return !!id && !!document.getElementById(id)?.textContent?.includes('valid email')
  })
  check('Field error tied to its input (aria-describedby)', tied)
  // Tap targets ≥ 44px on the map screen's controls
  const ctx2 = await browser.newContext({ viewport: { width: 390, height: 844 } })
  await asDriver(ctx2)
  const q = await ctx2.newPage()
  await q.goto(BASE + '#/app')
  await q.locator('.pin').first().waitFor()
  const small = await q.evaluate(() =>
    [...document.querySelectorAll('.app-body button, .app-body [role="button"]')]
      .filter((el) => el.offsetParent !== null && !el.closest('.leaflet-container'))
      .map((el) => {
        const r = el.getBoundingClientRect()
        // An invisible ::after can extend the hit area (chips, handle, segmented): count its real overhang.
        const after = getComputedStyle(el, '::after')
        const ext = after.content !== 'none' && after.position === 'absolute' ? Math.max(0, -parseFloat(after.top) || 0) + Math.max(0, -parseFloat(after.bottom) || 0) : 0
        return { h: r.height + ext, w: r.width, label: el.getAttribute('aria-label') || el.textContent.trim().slice(0, 20) }
      })
      .filter((b) => b.h < 44 || b.w < 44),
  )
  check('Map screen: tap targets ≥ 44px (chips via an extended hit area)', small.length === 0, JSON.stringify(small))
  await ctx2.close()
  // Contrast: muted text on --surface and on white
  const lum = (hex) => {
    const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
  }
  const ratio = (a, b) => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05)
  check('Contrast: --muted on --surface ≥ 4.5', ratio('#6b6b6b', '#f3f3f3') >= 4.5, ratio('#6b6b6b', '#f3f3f3').toFixed(2))
  check('Contrast: --blue-deep on white ≥ 4.5, black on --blue ≥ 4.5', ratio('#3e5f8a', '#ffffff') >= 4.5 && ratio('#000000', '#7399c6') >= 4.5)
  check('Contrast: amber badge text on its tint ≥ 4.5', ratio('#a35f00', '#fff4e0') >= 4.5, ratio('#a35f00', '#fff4e0').toFixed(2))
  await ctx.close()
}

await browser.close()
if (errors.length) results.push('FAIL  console/page errors: ' + [...new Set(errors)].join(' | '))
console.log(results.join('\n'))
console.log(`\n${results.filter((r) => r.startsWith('PASS')).length}/${results.length} passed`)
process.exit(results.some((r) => r.startsWith('FAIL')) ? 1 : 0)
