// Code review: the live demo exactly as in demo-kit/DEMO_SCRIPT.md, in the presenter view at 1280×720,
// several times in a row, each run starting from "Reset demo". Any console error or warning fails the run.
//   node scripts/review/demo10.mjs --runs 10 [--tz Europe/Moscow]
// Needs a running preview (PP_BASE, default http://localhost:4173/plug-and-park/), or PP_BASE = the live URL.

import { chromium } from 'playwright'

const args = process.argv.slice(2)
const opt = (n, d) => (args.indexOf(`--${n}`) >= 0 ? args[args.indexOf(`--${n}`) + 1] : d)
const RUNS = +opt('runs', '10')
const TZ = opt('tz', null)
const BASE = process.env.PP_BASE ?? 'http://localhost:4173/plug-and-park/'
const IGNORE = /tile\.openstreetmap|fonts\.g|ERR_FAILED|net::ERR/
const T = 8000
const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, ...(TZ ? { timezoneId: TZ } : {}) })
const P = await ctx.newPage()
let problems = []
P.on('pageerror', (e) => problems.push(`page error: ${e.message}`))
P.on('console', (m) => (m.type() === 'error' || m.type() === 'warning') && !IGNORE.test(m.text()) && problems.push(`console ${m.type()}: ${m.text()}`))
await P.goto(BASE + '#/presenter')
const d = P.frameLocator('iframe[name="driver"]')
const o = P.frameLocator('iframe[name="owner"]')
const text = async (loc) => (await loc.innerText()).replace(/\s+/g, ' ')
const must = (cond, msg) => {
  if (!cond) throw new Error(msg)
}

let failed = 0
for (let run = 1; run <= RUNS; run++) {
  problems = []
  const t0 = Date.now()
  try {
    await P.getByRole('button', { name: 'Reset demo' }).click()
    // 0:00 both phones at the start
    await d.locator('.pin').first().waitFor({ timeout: 15000 })
    await o.getByRole('heading', { name: 'Hi, Mei Ling' }).waitFor({ timeout: T })
    await o.getByText('1 request waiting').waitFor({ timeout: T })
    // 0:15 district search → Kwun Tong
    await d.getByRole('button', { name: /Where do you need to charge/ }).click()
    await d.getByRole('dialog', { name: 'Choose a district' }).getByRole('button', { name: /Kwun Tong/ }).click()
    await P.frame({ name: 'driver' }).waitForFunction(() => document.querySelectorAll('.pin').length === 1, null, { timeout: T })
    await P.waitForTimeout(900)
    // 0:35 the $30 pin → View details
    await d.locator('.pin[data-spot="sp_kwuntong_1"]').click()
    await d.getByRole('button', { name: 'View details' }).click()
    await d.locator('.carousel').waitFor({ timeout: T })
    // 1:00 Tomorrow 10:00 1 h → not available, suggestions
    await d.getByRole('button', { name: 'Request booking', exact: true }).click()
    const sheet = d.getByRole('dialog', { name: 'Request booking' })
    await sheet.getByRole('button', { name: 'Tomorrow', exact: true }).click()
    await sheet.getByRole('button', { name: '10:00', exact: true }).click()
    await sheet.getByRole('button', { name: '1 h', exact: true }).click()
    await sheet.getByRole('button', { name: 'Request booking · HK$30' }).click()
    await sheet.getByText('This slot is no longer available').waitFor({ timeout: T })
    const sugg = await sheet.locator('.notice .btn').evaluateAll((els) => els.map((b) => b.textContent.trim()).join(','))
    must(sugg === '09:00,12:00,12:30', `suggestions ${sugg}`)
    // 1:25 12:00 → pending
    await sheet.locator('.notice').getByRole('button', { name: '12:00', exact: true }).click()
    await sheet.getByRole('button', { name: 'Request booking · HK$30' }).click()
    await d.getByText('Waiting for Wong Mei Ling to approve').waitFor({ timeout: T })
    // 1:40 owner approves the top card
    const card = o.locator('.request-card').first()
    const cardText = await text(card)
    must(/Chan Tai Man/.test(cardText) && /4\.9/.test(cardText) && /Tesla Model Y/.test(cardText) && /You earn HK\$23\.70/.test(cardText), `owner card: ${cardText.slice(0, 120)}`)
    await card.getByRole('button', { name: 'Approve' }).click()
    await o.getByText('Approved — the driver has been notified').waitFor({ timeout: T })
    await d.getByText('Approved! Pay to confirm your booking').waitFor({ timeout: 3000 })
    await d.locator('.notify-toast').waitFor({ timeout: 3000 })
    // 2:00 declined card
    await d.getByRole('button', { name: 'Pay HK$30' }).click()
    await d.getByRole('button', { name: 'Use declined card' }).click()
    must((await d.getByLabel('Card number').inputValue()) === '4000 0000 0000 0002', 'declined card filled')
    await d.getByRole('button', { name: 'Pay HK$30' }).click()
    await d.getByText('Your card was declined. Try another card.').waitFor({ timeout: T })
    // 2:15 test card → QR + PIN 7350
    await d.getByRole('button', { name: 'Use test card' }).click()
    await d.getByRole('button', { name: 'Pay HK$30' }).click()
    await d.getByRole('heading', { name: "You're booked!" }).waitFor({ timeout: T })
    await d.locator('svg.qr').waitFor({ timeout: T })
    must((await text(d.locator('.pin-digits'))).replace(/ /g, '') === '7350', 'PIN 7350')
    // 2:35 start charging; the owner sees "Charging now"
    await d.getByRole('button', { name: /start charging/ }).click()
    await d.locator('.ring-wrap').waitFor({ timeout: T })
    await o.getByText('Charging now').waitFor({ timeout: T })
    await d.getByText('Session complete').waitFor({ timeout: 35000 })
    // 3:05 rate
    await d.getByRole('button', { name: 'Rate your experience' }).click()
    await d.getByRole('radio', { name: '5 stars' }).click()
    await d.getByRole('button', { name: 'Fast charging' }).click()
    await d.getByRole('button', { name: 'Submit review' }).click()
    await d.getByText('Thanks for your review!').waitFor({ timeout: T })
    // 3:25 earnings breakdown
    await o.getByRole('button', { name: 'Earnings' }).click()
    const row = o.locator('.tx-row').filter({ hasText: 'Chan Tai Man' }).first()
    await row.locator('.tx-main').click()
    const br = await text(row.locator('.breakdown'))
    must(/HK\$30\.00/.test(br) && /\(18%\) −HK\$5\.40/.test(br) && /\(3%\) −HK\$0\.90/.test(br) && /You receive HK\$23\.70/.test(br), `breakdown: ${br}`)
    // 3:55 Spots → Hoi Bun Road → Availability
    await o.getByRole('button', { name: 'Spots' }).click()
    await o.getByRole('button', { name: /Industrial building bay — Hoi Bun Road/ }).click()
    await o.getByRole('heading', { name: 'Availability' }).scrollIntoViewIfNeeded()
    must((await o.locator('.sched-row').count()) === 7, 'seven day rows')
    // 4:10 ← → Earnings → Withdraw
    await o.getByRole('button', { name: 'Back' }).first().click()
    await o.getByRole('button', { name: 'Earnings' }).click()
    await o.getByRole('button', { name: 'Withdraw', exact: true }).click()
    await o.getByRole('button', { name: 'Withdraw HK$117.71' }).click()
    await o.getByText('HK$117.71 on its way').waitFor({ timeout: T })
    await o.getByRole('button', { name: 'Done' }).click()
    await o.locator('[data-payout]').first().getByText('Paid', { exact: true }).waitFor({ timeout: 15000 })
    must(problems.length === 0, problems.join(' | '))
    console.log(`  ✓ run ${run}/${RUNS} passed in ${Math.round((Date.now() - t0) / 1000)} s`)
  } catch (e) {
    failed++
    console.log(`  ✗ run ${run}/${RUNS} FAILED: ${e.message.split('\n')[0]}${problems.length ? ' · ' + problems.join(' | ') : ''}`)
    await P.goto('about:blank')
    await P.goto(BASE + '#/presenter')
  }
}
await browser.close()
console.log(failed ? `✗ ${failed}/${RUNS} demo run(s) failed` : `✓ ${RUNS}/${RUNS} demo runs passed (presenter view 1280×720${TZ ? ', ' + TZ : ''})`)
process.exit(failed ? 1 : 0)
