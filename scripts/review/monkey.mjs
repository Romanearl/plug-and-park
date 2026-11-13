// Code-review "monkey": taps random visible controls and types random (hostile) text for a few minutes,
// with a fixed seed so a run can be repeated exactly.
//   node scripts/review/monkey.mjs --role driver --seed 1 --ms 180000
// Needs a running preview (PP_BASE, default http://localhost:4173/plug-and-park/).
// Reports console errors/warnings, uncaught exceptions, blank screens and stuck spinners with the last steps.

import { chromium } from 'playwright'

const args = process.argv.slice(2)
const opt = (n, d) => (args.indexOf(`--${n}`) >= 0 ? args[args.indexOf(`--${n}`) + 1] : d)
const BASE = process.env.PP_BASE ?? 'http://localhost:4173/plug-and-park/'
const ROLE = opt('role', 'driver')
const SEED = +opt('seed', '1')
const MS = +opt('ms', '180000')
const USER = ROLE === 'owner' ? 'u_owner_demo' : 'u_driver_demo'
const HOME = ROLE === 'owner' ? '#/owner' : '#/app'
const IGNORE = /tile\.openstreetmap|fonts\.g|ERR_FAILED|net::ERR/

// mulberry32
let a = SEED >>> 0
const rnd = () => {
  a = (a + 0x6d2b79f5) >>> 0
  let t = a
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
const pick = (xs) => xs[Math.floor(rnd() * xs.length)]

const TEXTS = [
  '', ' ', 'a', 'Chan Tai Man', '陳大文', '😀🚗⚡', '<script>alert(1)</script>', '"><img src=x onerror=alert(1)>', '  padded  ',
  'x'.repeat(300), '4242 4242 4242 4242', '4000-0000-0000-0002', '12/30', '1', '123', '123456', '000000', '9123 4567', '+852 6123-9876',
  'driver@plugpark.demo', 'Demo1234!', 'not-an-email', "O'Brien-Smith", '0', '-1', '99999999999999999999', 'null', 'undefined',
]

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
await ctx.route(/^https?:\/\/(?!localhost|tile\.openstreetmap|fonts\.)/, (r) => r.abort()) // never leave for other sites
const page = await ctx.newPage()
const problems = []
const steps = []
const note = (what) => problems.push({ what, at: steps.length, last: steps.slice(-8) })
page.on('pageerror', (e) => note(`page error: ${e.message}`))
page.on('console', (m) => (m.type() === 'error' || m.type() === 'warning') && !IGNORE.test(m.text()) && note(`console ${m.type()}: ${m.text()}`))
page.on('dialog', (d) => {
  note(`native dialog: ${d.message()}`)
  void d.dismiss()
})

const signIn = async () => {
  await page.goto(BASE + '#/')
  await page.evaluate((u) => sessionStorage.setItem('pp.session.main', u), USER)
  await page.goto('about:blank')
  await page.goto(BASE + HOME)
}
await signIn()

const t0 = Date.now()
let spinnerSince = 0
let idleOut = 0
while (Date.now() - t0 < MS) {
  if (!page.url().startsWith(BASE)) {
    note(`left the app: ${page.url()}`)
    await signIn()
  }
  // Signed out (reset / sign out) or on the presenter page: after a few steps, come back in.
  const where = await page.evaluate(() => location.hash)
  if (/^#\/(presenter)?$|^#\/(login|register|verify)/.test(where)) {
    if (++idleOut > 12) {
      idleOut = 0
      steps.push('(sign back in)')
      await signIn()
      continue
    }
  } else idleOut = 0

  const els = await page.evaluate(() => {
    const out = []
    const sel = 'button, a[href], [role="button"], [role="radio"], [role="tab"], input:not([type="file"]), select, textarea, .pin, label.switch, label.checkbox'
    let i = 0
    for (const el of document.querySelectorAll(sel)) {
      const r = el.getBoundingClientRect()
      if (r.width < 4 || r.height < 4 || r.bottom < 0 || r.top > innerHeight || el.disabled) continue
      if (el.tagName === 'A' && !el.getAttribute('href').startsWith('#') && el.target === '_blank') continue
      el.setAttribute('data-mk', String(i))
      out.push({ i, tag: el.tagName, type: el.type || '', text: (el.getAttribute('aria-label') || el.innerText || el.placeholder || '').trim().slice(0, 40) })
      i++
    }
    return out
  })
  if (!els.length) {
    steps.push('(nothing to tap)')
    const blank = await page.evaluate(() => (document.querySelector('.app-body')?.innerText ?? document.body.innerText).trim().length === 0)
    if (blank) {
      await page.waitForTimeout(1500)
      const still = await page.evaluate(() => (document.querySelector('.app-body')?.innerText ?? document.body.innerText).trim().length === 0)
      if (still) note(`blank screen at ${await page.evaluate(() => location.hash)}`)
    }
    await signIn()
    continue
  }
  const e = pick(els)
  const loc = page.locator(`[data-mk="${e.i}"]`).first()
  try {
    if (e.tag === 'SELECT') {
      const n = await loc.evaluate((s) => s.options.length)
      await loc.selectOption({ index: Math.floor(rnd() * n) }, { timeout: 800 })
      steps.push(`select "${e.text}"`)
    } else if (e.tag === 'TEXTAREA' || (e.tag === 'INPUT' && !['checkbox', 'radio', 'range'].includes(e.type))) {
      const v = pick(TEXTS)
      await loc.fill(v, { timeout: 800 })
      if (rnd() < 0.4) await loc.blur()
      if (rnd() < 0.15) await page.keyboard.press('Enter')
      steps.push(`type ${JSON.stringify(v.slice(0, 24))} into "${e.text}"`)
    } else {
      await loc.click({ timeout: 800, force: rnd() < 0.3 })
      steps.push(`tap ${e.tag.toLowerCase()} "${e.text}"`)
      if (rnd() < 0.12) {
        await loc.click({ timeout: 300, force: true }).catch(() => {}) // double tap
        steps.push('  (double tap)')
      }
    }
  } catch {
    steps.push(`(miss) ${e.tag.toLowerCase()} "${e.text}"`)
  }
  if (rnd() < 0.04) {
    await page.goBack().catch(() => {})
    steps.push('browser Back')
  } else if (rnd() < 0.02) {
    await page.reload()
    steps.push('reload')
  }
  await page.waitForTimeout(60)

  const state = await page.evaluate(() => ({
    hash: location.hash,
    spinner: !!document.querySelector('.spinner'),
    bad: /NaN|undefined|Invalid Date|\[object Object\]/.test(document.querySelector('.app-body')?.innerText ?? ''),
    overflow: [...document.querySelectorAll('.scroll, .screen, body')].some((el) => el.scrollWidth > el.clientWidth + 1),
  }))
  if (state.bad && !steps.slice(-3).some((s) => /undefined|null|NaN/.test(s))) note(`bad text (NaN/undefined/Invalid Date) at ${state.hash}`)
  if (state.overflow) note(`horizontal overflow at ${state.hash}`)
  if (state.spinner) {
    spinnerSince ||= Date.now()
    if (Date.now() - spinnerSince > 12_000) {
      note(`spinner stuck > 12 s at ${state.hash}`)
      spinnerSince = 0
      await signIn()
    }
  } else spinnerSince = 0
}

await browser.close()
const seenWhat = new Set()
const unique = problems.filter((p) => !seenWhat.has(p.what) && seenWhat.add(p.what))
console.log(`monkey ${ROLE} seed ${SEED}: ${steps.length} steps in ${Math.round((Date.now() - t0) / 1000)} s, ${unique.length} distinct problem(s) (${problems.length} total)`)
for (const p of unique) console.log(`\n✗ ${p.what}\n   step ${p.at}; last steps:\n     ${p.last.join('\n     ')}`)
process.exit(unique.length ? 1 : 0)
