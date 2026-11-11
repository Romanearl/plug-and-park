// npm run smoke                         → the exact demo path, 1 run, Chromium, local production build
// npm run smoke -- --runs 5             → five times in a row
// npm run smoke -- --browser webkit     → chromium | webkit | firefox
// npm run smoke -- --size 1920x1080     → run the single-phone path inside the frame at that size
// npm run smoke -- --url https://romanearl.github.io/plug-and-park/   → against the live site
// npm run smoke -- --quick              → skip the S7 branch/onboarding checks
// Two pages in one browser context (driver + owner) + the presenter view. Fails on any console error or warning.

import { spawnSync } from 'node:child_process'
import path from 'node:path'
import playwright from 'playwright'
import { BASE as LOCAL, ROOT, build, startPreview } from './lib/server.mjs'

const args = process.argv.slice(2)
const opt = (name, dflt) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 ? args[i + 1] : dflt
}
const RUNS = +opt('runs', '1')
const BROWSER = opt('browser', 'chromium')
const URL = opt('url', null)
const SIZE = opt('size', null)
const QUICK = args.includes('--quick')
const BASE = URL ? (URL.endsWith('/') ? URL : URL + '/') : LOCAL
const IGNORE = /tile\.openstreetmap|basemaps\.cartocdn|fonts\.g|ERR_FAILED|net::ERR/
const T = 8000

function step(label) {
  process.stdout.write(`  · ${label}\n`)
}
const assert = (cond, msg) => {
  if (!cond) throw new Error(`ASSERT: ${msg}`)
}
const dbOf = (p) => p.evaluate(() => JSON.parse(localStorage.getItem('pp.db')))

async function demoSheet(p) {
  await p.getByRole('button', { name: /Demo only/ }).click()
  const d = p.getByRole('dialog', { name: 'Demo controls' })
  await d.waitFor({ timeout: T })
  return d
}

/** Booking sheet on the current spot details: tomorrow / time / 1 h → submit. */
async function requestSlot(root, time) {
  const sheet = root.getByRole('dialog', { name: 'Request booking' })
  if (!(await sheet.isVisible().catch(() => false))) await root.getByRole('button', { name: 'Request booking', exact: true }).click()
  await sheet.getByRole('button', { name: 'Tomorrow', exact: true }).click()
  await sheet.getByRole('button', { name: time, exact: true }).click()
  await sheet.getByRole('button', { name: '1 h', exact: true }).click()
  await sheet.getByRole('button', { name: /^Request booking ·/ }).click()
  return sheet
}

async function onePath(browser, run) {
  const phone = SIZE ? { viewport: { width: +SIZE.split('x')[0], height: +SIZE.split('x')[1] } } : { viewport: { width: 390, height: 844 }, ...(BROWSER === 'firefox' ? {} : { isMobile: true, hasTouch: true }) }
  const ctx = await browser.newContext(phone)
  const problems = []
  const watch = (p, who) => {
    p.on('pageerror', (e) => problems.push(`${who}: page error: ${e.message}`))
    p.on('console', (m) => {
      if ((m.type() === 'error' || m.type() === 'warning') && !IGNORE.test(m.text())) problems.push(`${who}: console ${m.type()}: ${m.text()}`)
    })
  }
  const D = await ctx.newPage()
  watch(D, 'driver')
  const email = `smoke.${BROWSER}.${run}.${Date.now()}@example.com`

  step('1 reset + register a new driver (one error first) + OTP')
  await D.goto(BASE + '#/')
  let sheet = await demoSheet(D)
  await sheet.getByRole('button', { name: 'Reset demo' }).click()
  await sheet.getByRole('button', { name: 'Tap again to wipe all demo data' }).click()
  await D.getByText('Charge where').waitFor({ timeout: T })
  await D.getByRole('button', { name: /Get started/ }).click()
  await D.getByRole('radio', { name: /I drive an EV/ }).click()
  await D.getByLabel('Full name').fill('Smoke Test Driver')
  await D.getByLabel('Email').fill('smoke@nowhere')
  await D.getByLabel('Email').blur()
  await D.getByText('Enter a valid email').waitFor({ timeout: T })
  await D.getByLabel('Email').fill(email)
  await D.getByLabel('Mobile number').fill('61234567')
  await D.getByLabel('Password', { exact: true }).fill('Charge2026')
  await D.getByLabel('Confirm password').fill('Charge2026')
  await D.getByText('I agree to the Terms').click()
  await D.getByRole('button', { name: 'Continue' }).click()
  await D.getByLabel('Digit 1 of 6').waitFor({ timeout: T })
  await D.keyboard.type('123456')
  await D.locator('.pin').first().waitFor({ timeout: 15000 })

  step('2 CCS2 filter → Kwun Tong → details')
  await D.getByRole('toolbar', { name: 'Filters' }).getByRole('button', { name: 'CCS2', exact: true }).click()
  assert((await D.locator('.pin').count()) === 3, 'CCS2 → 3 pins')
  await D.locator('.spot-card[data-spot="sp_kwuntong_1"]').click()
  await D.getByRole('button', { name: 'View details' }).click()
  await D.locator('.carousel').waitFor({ timeout: T })

  step('3 tomorrow 10:00 → unavailable → suggestion → pending')
  sheet = await requestSlot(D, '10:00')
  await sheet.getByText('This slot is no longer available').waitFor({ timeout: T })
  await sheet.locator('.notice .btn').first().click()
  await sheet.getByRole('button', { name: /^Request booking ·/ }).click()
  await D.waitForFunction(() => location.hash.startsWith('#/app/booking/'), null, { timeout: T })
  const id = D.url().split('/').pop()
  await D.locator('.status-card[data-status="pending"]').waitFor({ timeout: T })

  step('4 owner: live request with rating → Approve')
  const O = await ctx.newPage()
  watch(O, 'owner')
  await O.goto(BASE + '#/')
  await O.evaluate(() => sessionStorage.setItem('pp.session.main', 'u_owner_demo'))
  await O.goto('about:blank')
  await O.goto(BASE + '#/owner')
  const card = O.locator(`.request-card[data-booking="${id}"]`)
  await card.waitFor({ timeout: T })
  assert((await card.textContent()).includes('Smoke Test Driver') && /New|★/.test(await card.textContent()), 'card shows driver + rating')
  await card.getByRole('button', { name: 'Approve' }).click()

  step('5 driver flips live → declined card → 4242 → QR + PIN')
  await D.bringToFront()
  await D.locator('.status-card[data-status="confirmed"]').waitFor({ timeout: 3000 })
  await D.getByRole('button', { name: /^Pay HK\$/ }).click()
  await D.getByRole('button', { name: 'Use test card' }).click()
  await D.getByLabel('Card number', { exact: true }).fill('4000000000000002')
  await D.getByRole('button', { name: /^Pay HK\$/ }).click()
  await D.getByText('Your card was declined. Try another card.').waitFor({ timeout: T })
  await D.getByRole('button', { name: 'Use test card' }).click()
  await D.getByRole('button', { name: /^Pay HK\$/ }).click()
  await D.locator('svg.qr').waitFor({ timeout: T })
  assert(await D.getByLabel(/^PIN \d/).isVisible(), 'PIN shown')

  step('6 start → progress → complete → 5-star review → count rises')
  const before = (await dbOf(D)).spots.find((s) => s.id === 'sp_kwuntong_1').reviewsCount
  await D.getByRole('button', { name: /start charging/ }).click()
  await D.locator('.ring-wrap').waitFor({ timeout: T })
  const p1 = +(await D.locator('.ring-wrap').getAttribute('data-progress'))
  await D.waitForTimeout(1500)
  const p2 = +(await D.locator('.ring-wrap').getAttribute('data-progress'))
  assert(p2 > p1, `progress moves (${p1} → ${p2})`)
  await D.getByText('Session complete').waitFor({ timeout: 35000 })
  await D.getByRole('button', { name: 'Rate your experience' }).click()
  await D.getByRole('radio', { name: '5 stars' }).click()
  await D.getByRole('button', { name: 'Submit review' }).click()
  await D.getByText('Thanks for your review!').waitFor({ timeout: T })
  const after = (await dbOf(D)).spots.find((s) => s.id === 'sp_kwuntong_1').reviewsCount
  assert(after === before + 1, `review count ${before} → ${after}`)

  step('7 owner: net in Available → Withdraw FPS → Paid')
  await O.bringToFront()
  await O.getByRole('button', { name: 'Earnings' }).click()
  const avail = O.locator('[data-available]')
  await O.waitForFunction(() => +document.querySelector('[data-available]').getAttribute('data-available') === 117.71, null, { timeout: T })
  await O.getByRole('button', { name: 'Withdraw', exact: true }).click()
  await O.getByRole('button', { name: /^Withdraw HK\$/ }).click()
  await O.getByText(/On its way/).waitFor({ timeout: T })
  await O.getByRole('button', { name: 'Done' }).click()
  assert(+(await avail.getAttribute('data-available')) === 0, 'available → 0')
  await O.locator('[data-payout]').first().getByText('Paid', { exact: true }).waitFor({ timeout: 15000 })
  await ctx.close()
  return problems
}

async function presenterPath(browser) {
  step('8 presenter view at 1280×720: request → approve → pay → charge → rate')
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } })
  const problems = []
  const P = await ctx.newPage()
  P.on('pageerror', (e) => problems.push(`presenter: page error: ${e.message}`))
  P.on('console', (m) => (m.type() === 'error' || m.type() === 'warning') && !IGNORE.test(m.text()) && problems.push(`presenter: console ${m.type()}: ${m.text()}`))
  await P.goto(BASE + '#/presenter')
  const d = P.frameLocator('iframe[name="driver"]')
  const o = P.frameLocator('iframe[name="owner"]')
  await d.locator('.pin').first().waitFor({ timeout: 15000 })
  await o.getByRole('heading', { name: 'Hi, Mei Ling' }).waitFor({ timeout: T })
  await P.getByRole('button', { name: 'Reset demo' }).click()
  await d.locator('.pin').first().waitFor({ timeout: 15000 })
  const df = P.frame({ name: 'driver' })
  await df.evaluate(() => (location.hash = '#/app/spot/sp_kwuntong_1'))
  await d.locator('.carousel').waitFor({ timeout: T })
  await requestSlot(d, '13:00')
  await df.waitForFunction(() => location.hash.startsWith('#/app/booking/'), null, { timeout: T })
  const id = df.url().split('/').pop()
  await o.locator(`.request-card[data-booking="${id}"]`).getByRole('button', { name: 'Approve' }).click({ timeout: T })
  await d.locator('.status-card[data-status="confirmed"]').waitFor({ timeout: 3000 })
  await d.getByRole('button', { name: /^Pay HK\$/ }).click()
  await d.getByRole('button', { name: 'Use test card' }).click()
  await d.getByRole('button', { name: /^Pay HK\$/ }).click()
  await d.locator('svg.qr').waitFor({ timeout: T })
  await d.getByRole('button', { name: /start charging/ }).click()
  await d.locator('.ring-wrap').waitFor({ timeout: T })
  await d.getByText('Session complete').waitFor({ timeout: 35000 })
  await d.getByRole('button', { name: 'Rate your experience' }).click()
  await d.getByRole('radio', { name: '5 stars' }).click()
  await d.getByRole('button', { name: 'Submit review' }).click()
  await d.getByText('Thanks for your review!').waitFor({ timeout: T })
  const of = P.frame({ name: 'owner' })
  await of.evaluate(() => (location.hash = '#/owner/earnings'))
  await o.getByText('HK$117.71').first().waitFor({ timeout: T })
  await ctx.close()
  return problems
}

const stop = URL ? () => {} : (build(), await startPreview())
let failed = 0
try {
  const browser = await playwright[BROWSER].launch()
  for (let run = 1; run <= RUNS; run++) {
    console.log(`\n── smoke run ${run}/${RUNS} · ${BROWSER}${SIZE ? ' · ' + SIZE : ''} · ${URL ? 'LIVE ' + BASE : 'local build'}`)
    const t0 = Date.now()
    try {
      const probs = [...(await onePath(browser, run)), ...(await presenterPath(browser))]
      if (!QUICK && !URL && BROWSER === 'chromium') {
        step('S7: four "No" branches + new-owner onboarding (scripts/checks/s7.mjs)')
        const r = spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'checks', 's7.mjs')], { cwd: ROOT, env: { ...process.env, PP_BASE: BASE }, encoding: 'utf8' })
        if (r.status !== 0) probs.push('s7 branch/onboarding checks failed:\n' + (r.stdout || '').split('\n').filter((l) => l.startsWith('FAIL')).join('\n'))
      }
      if (probs.length) throw new Error(probs.join('\n'))
      console.log(`  ✓ run ${run} passed in ${((Date.now() - t0) / 1000).toFixed(0)} s`)
    } catch (e) {
      failed++
      console.error(`  ✗ run ${run} FAILED: ${e.message.split('\n').slice(0, 8).join('\n    ')}`)
    }
  }
  await browser.close()
} finally {
  stop()
}
console.log(failed ? `\n✗ ${failed}/${RUNS} smoke run(s) failed` : `\n✓ ${RUNS}/${RUNS} smoke run(s) passed (${BROWSER})`)
process.exit(failed ? 1 : 0)
