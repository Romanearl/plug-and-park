// Checks the S6 "done when" items. Run via `npm run check` (or with `npm run preview` running: node scripts/checks/s6.mjs)
import { chromium } from 'playwright'
import { createServer } from 'vite'

const BASE = process.env.PP_BASE ?? 'http://localhost:4173/plug-and-park/'
const results = []
const check = (name, ok, extra = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? ' - ' + extra : ''}`)
const seen = (loc, timeout = 4000) => loc.waitFor({ timeout }).then(() => true, () => false)
const IGNORE = /tile\.openstreetmap|basemaps\.cartocdn|fonts\.g|ERR_FAILED|net::/

// ── 1. Money rules ──
{
  const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' })
  try {
    const m = await vite.ssrLoadModule('/src/lib/money.ts')
    const b30 = m.breakdown(30)
    const b50 = m.breakdown(50)
    check('breakdown(30) → 5.40 / 0.90 / net 23.70', b30.gross === 30 && b30.commission === 5.4 && b30.gatewayFee === 0.9 && b30.net === 23.7, JSON.stringify(b30))
    check('breakdown(50) → 9.00 / 1.50 / net 39.50', b50.commission === 9 && b50.gatewayFee === 1.5 && b50.net === 39.5, JSON.stringify(b50))
    check('breakdown rounds to cents (24 → 18.96, 15 → 11.85)', m.breakdown(24).net === 18.96 && m.breakdown(15).net === 11.85)
    const bk = (status, price) => ({ ownerId: 'o', status, price, commissionRate: 0.18 })
    const db = {
      bookings: [bk('completed', 30), bk('completed', 50), bk('paid', 30), bk('active', 50), bk('pending', 30), bk('declined', 30), { ...bk('completed', 30), ownerId: 'x' }],
      payouts: [{ ownerId: 'o', amount: 20 }, { ownerId: 'x', amount: 5 }],
    }
    const bal = m.ownerBalance('o', db)
    check('ownerBalance: escrow 63.20, lifetime 63.20, paidOut 20, available 43.20', bal.inEscrow === 63.2 && bal.lifetimeNet === 63.2 && bal.paidOut === 20 && bal.available === 43.2, JSON.stringify(bal))
    const t0 = new Date(0).toISOString()
    check('payoutStatus: processing < 8 s, paid ≥ 8 s', m.payoutStatus({ createdAt: t0, status: 'processing' }, 7_999) === 'processing' && m.payoutStatus({ createdAt: t0, status: 'processing' }, 8_000) === 'paid')
    check('validateFpsId: mobile / +852 / email ok; "abc", 7 digits rejected', !m.validateFpsId('9123 4567') && !m.validateFpsId('+852 6123 9876') && !m.validateFpsId('mei@example.hk') && !!m.validateFpsId('abc') && !!m.validateFpsId('9123456'))
    check('validateAccountNumber 9–12 digits', !m.validateAccountNumber('123456789') && !m.validateAccountNumber('1234 5678 9012') && !!m.validateAccountNumber('12345678') && !!m.validateAccountNumber('1234567890123'))
    check('validatePin exactly 4 digits; validateRange', !m.validatePin('1234') && !!m.validatePin('12') && !m.validateRange('09:00', '17:00') && m.validateRange('17:00', '09:00') === 'End time must be after start time')
  } finally {
    await vite.close()
  }
}

const browser = await chromium.launch()
const errors = []
async function tab(ctx, user) {
  const p = await ctx.newPage()
  p.on('pageerror', (e) => errors.push(e.message))
  p.on('console', (msg) => msg.type() === 'error' && !IGNORE.test(msg.text()) && errors.push(msg.text()))
  await p.addInitScript((uid) => {
    try {
      sessionStorage.getItem('pp.session.main') || sessionStorage.setItem('pp.session.main', uid)
    } catch {}
  }, user)
  return p
}
const amount = async (p, attr) => +(await p.locator(`[data-${attr}]`).getAttribute(`data-${attr}`))
async function waitAmount(p, attr, value, ms = 3000) {
  const until = Date.now() + ms
  while (Date.now() < until) {
    if ((await amount(p, attr)) === value) return true
    await p.waitForTimeout(100)
  }
  return false
}

// ── 2. Earnings screen from the seed + live escrow → available ──
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const owner = await tab(ctx, 'u_owner_demo')
  await owner.goto(BASE + '#/owner/earnings')
  check('Available HK$94.01 (4 completed seed bookings, net)', (await waitAmount(owner, 'available', 94.01)) && (await seen(owner.getByText('HK$94.01').first())))
  check('Held HK$47.40 (paid 10:00 booking) · paid out HK$0.00', (await amount(owner, 'escrow')) === 47.4 && (await amount(owner, 'paidout')) === 0)
  check('Pending group: "Released after the session"', await seen(owner.locator('[data-booking="bk_block_1"]').getByText('Released after the session')))
  await owner.locator('.tx-row[data-booking="bk_hist_1"] .tx-main').click()
  const br = owner.locator('.tx-row[data-booking="bk_hist_1"] .breakdown')
  const brText = (await br.textContent()) ?? ''
  check('Breakdown: HK$30.00 − HK$5.40 − HK$0.90 = HK$23.70', ['Booking total', 'HK$30.00', 'Plug & Park fee (18%)', '−HK$5.40', 'Payment processing (3%)', '−HK$0.90', 'You receive', 'HK$23.70'].every((t) => brText.includes(t)), brText)
  check('Week chart present (7 bars, SVG)', (await owner.locator('.week-chart rect').count()) === 7)

  // Driver pays, then finishes, on the other phone → owner numbers move live.
  const driver = await tab(ctx, 'u_driver_demo')
  await driver.goto(BASE + '#/app/bookings')
  const id = await driver.evaluate(() => {
    const db = JSON.parse(localStorage.getItem('pp.db'))
    const start = new Date()
    start.setDate(start.getDate() + 1)
    start.setHours(13, 0, 0, 0)
    const now = new Date().toISOString()
    db.bookings.push({ id: 'bk_s6live', spotId: 'sp_kwuntong_1', driverId: 'u_driver_demo', ownerId: 'u_owner_demo', start: start.toISOString(), durationMinutes: 60, price: 30, commissionRate: 0.18, status: 'confirmed', createdAt: now, updatedAt: now })
    localStorage.setItem('pp.db', JSON.stringify(db))
    return 'bk_s6live'
  })
  await driver.bringToFront()
  await driver.goto(BASE + `#/app/pay/${id}`)
  await driver.reload()
  await driver.getByRole('button', { name: 'Use test card' }).click()
  await driver.getByRole('button', { name: 'Pay HK$30' }).click()
  await driver.waitForURL(/#\/app\/confirm\//, { timeout: 6000 })
  check('Driver pays → owner "Held" +23.70 live (71.10)', await waitAmount(owner, 'escrow', 71.1))
  await driver.getByRole('button', { name: /start charging/ }).click()
  await driver.waitForURL(/#\/app\/session\//, { timeout: 4000 })
  await driver.getByRole('button', { name: /Demo only/ }).click()
  await driver.getByRole('button', { name: 'Skip charging to the end' }).click()
  check('Session completes → moves to "Available" live (117.71, held back to 47.40)', (await waitAmount(owner, 'available', 117.71)) && (await amount(owner, 'escrow')) === 47.4)

  // Withdraw via bank: validation, masked storage, balance → 0
  await owner.bringToFront()
  await owner.getByRole('button', { name: 'Withdraw', exact: true }).click()
  const sheet = owner.getByRole('dialog', { name: 'Withdraw' })
  check('Withdraw sheet: FPS ID pre-filled with the phone', (await sheet.getByLabel('FPS ID (mobile or email)').inputValue()) === '+852 6123 9876')
  await sheet.getByLabel('FPS ID (mobile or email)').fill('abc')
  await sheet.getByRole('button', { name: /^Withdraw HK\$/ }).click()
  check('FPS validation error', await seen(sheet.getByText('Enter an 8-digit HK mobile number or an email')))
  await sheet.getByRole('radio', { name: /Bank transfer/ }).click()
  await sheet.getByLabel('Account number').fill('12345678')
  await sheet.getByRole('button', { name: /^Withdraw HK\$/ }).click()
  check('Bank account validation error', await seen(sheet.getByText('Enter a 9–12 digit account number')))
  await sheet.getByLabel('Account number').fill('123456789012')
  await sheet.getByRole('button', { name: 'Withdraw HK$117.71' }).click()
  check('Success: "On its way"', await seen(owner.getByText(/On its way — usually within minutes/)))
  await owner.getByRole('button', { name: 'Done' }).click()
  check('Available → HK$0.00, paid out 117.71', (await waitAmount(owner, 'available', 0)) && (await amount(owner, 'paidout')) === 117.71)
  const po = owner.locator('[data-payout]').first()
  check('Payout row: masked "Bank A •••• 9012", Processing', (await seen(po.getByText('Bank A •••• 9012'))) && (await seen(po.getByText('Processing'))))
  const stored = await owner.evaluate(() => JSON.stringify({ ...localStorage }) + JSON.stringify({ ...sessionStorage }))
  check('Full bank account number never stored', !stored.includes('123456789012') && !stored.includes('1234 5678 9012'))
  check('No card data stored either (S5 scan)', !/4242\s?4242\s?4242\s?4242/.test(stored))
  await owner.reload()
  check('After reload still Processing (from createdAt)', await seen(owner.locator('[data-payout]').first().getByText('Processing')))
  check('Turns Paid by itself (~8 s)', await seen(owner.locator('[data-payout]').first().getByText('Paid', { exact: true }), 10000))
  await owner.getByRole('button', { name: 'Withdraw', exact: true }).click()
  check('Zero balance: Withdraw disabled with hint', (await seen(owner.getByText(/Nothing to withdraw yet/))) && (await owner.getByRole('button', { name: /^Withdraw HK\$/ }).isDisabled()))
  await owner.getByRole('button', { name: 'Close' }).click()

  // Account details
  await owner.getByRole('button', { name: 'Account' }).click()
  check('Owner account: spots, lifetime net, masked payout method', (await seen(owner.getByText('4 listed'))) && (await seen(owner.getByText('HK$117.71'))) && (await seen(owner.getByText('Bank A •••• 9012'))))
  // History
  await owner.getByRole('button', { name: 'Requests' }).click()
  check('Requests history lists completed bookings', await seen(owner.locator('.history-list [data-booking="bk_hist_1"]').getByText('Completed')))
  await ctx.close()
}

// ── 3. Spots: active switch (live), price, scheduler, access ──
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const driver = await tab(ctx, 'u_driver_demo')
  await driver.goto(BASE + '#/app')
  await driver.locator('.pin').first().waitFor()
  const owner = await tab(ctx, 'u_owner_demo')
  await owner.goto(BASE + '#/owner/spots')
  await owner.bringToFront() // background tabs don't run rAF, so Playwright's stability check would hang
  check('My spots: 4 spots with switches', (await owner.locator('.owner-spot').count()) === 4)
  await owner.getByRole('switch', { name: /Fo Tan listed/ }).uncheck({ force: true })
  const t0 = Date.now()
  const gone = await driver.locator('.pin[data-spot="sp_shatin_1"]').waitFor({ state: 'detached', timeout: 1000 }).then(() => true, () => false)
  check('Switch off → pin disappears on the driver phone within 1 s', gone && (await driver.locator('.pin').count()) === 11, `${Date.now() - t0} ms`)
  await driver.bringToFront()
  await driver.goto(BASE + '#/app/spot/sp_shatin_1')
  check('Hidden spot can\'t be opened/requested', await seen(driver.getByText('This charger is no longer listed')))
  await owner.bringToFront()
  await owner.getByRole('switch', { name: /Fo Tan listed/ }).check({ force: true })
  check('Switch on → listed again', await seen(driver.getByRole('heading', { name: /Fo Tan/ }).first(), 2000))

  // Manage Sai Kung garage
  await owner.getByText('Village house garage — Tai Mong Tsai').click()
  await owner.waitForURL(/#\/owner\/spots\/sp_saikung_1$/)
  // Price
  await owner.getByRole('button', { name: 'Raise price' }).click()
  await owner.getByRole('button', { name: 'Raise price' }).click()
  await owner.getByRole('button', { name: 'Raise price' }).click()
  check('Price 28 → "you receive about HK$22.12"', await seen(owner.getByText('Drivers pay HK$28/hour · you receive about HK$22.12')))
  await owner.getByRole('button', { name: 'Save price' }).click()
  check('Price saved toast + stored', (await seen(owner.getByText('Price saved'))) && (await owner.evaluate(() => JSON.parse(localStorage.getItem('pp.db')).spots.find((s) => s.id === 'sp_saikung_1').pricePerHour)) === 28)

  // Scheduler: invalid range rejected
  const before = await owner.evaluate(() => JSON.stringify(JSON.parse(localStorage.getItem('pp.db')).spots.find((s) => s.id === 'sp_saikung_1').availability))
  await owner.getByLabel('Monday to').selectOption('07:00')
  check('Invalid range → "End time must be after start time"', await seen(owner.getByText('End time must be after start time')))
  await owner.getByRole('button', { name: 'Save availability' }).click()
  const after = await owner.evaluate(() => JSON.stringify(JSON.parse(localStorage.getItem('pp.db')).spots.find((s) => s.id === 'sp_saikung_1').availability))
  check('Invalid schedule is not saved', before === after)
  await owner.getByRole('button', { name: 'Weekdays 08:30–19:00' }).click()
  check('Preset fixes Monday and summary shows "Mon–Fri 08:30–19:00"', (await owner.getByText('End time must be after start time').count()) === 0 && (await seen(owner.getByLabel('Summary').getByText('Mon–Fri 08:30–19:00'))))

  // Tomorrow 10:00–14:00 only on that weekday, then driver booking sheet offers exactly those hours.
  const tomorrowDay = await owner.evaluate(() => (new Date().getDay() + 1) % 7)
  const DAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][tomorrowDay]
  const sw = owner.getByRole('switch', { name: `${DAY} available` })
  if (!(await sw.isChecked())) await sw.check({ force: true })
  await owner.getByLabel(`${DAY} from`).selectOption('10:00')
  await owner.getByLabel(`${DAY} to`).selectOption('14:00')
  await driver.goto(BASE + '#/app/spot/sp_saikung_1')
  await driver.getByRole('heading', { name: /Tai Mong Tsai/ }).first().waitFor()
  await owner.bringToFront()
  await owner.getByRole('button', { name: 'Save availability' }).click()
  check('Availability saved toast', await seen(owner.getByText('Availability saved')))
  const short = DAY.slice(0, 3)
  const expectLine = ['Saturday', 'Sunday'].includes(DAY) ? `${short} 10:00–14:00` : null
  const detailsUpdated = await seen(driver.getByText(expectLine ?? /10:00–14:00/).first(), 2000)
  check("Driver's spot details update live", detailsUpdated)
  await driver.bringToFront()
  await driver.getByRole('button', { name: 'Request booking' }).click()
  const bs = driver.getByRole('dialog', { name: 'Request booking' })
  await bs.getByRole('button', { name: 'Tomorrow', exact: true }).click()
  const times = await bs.locator('.time-chip').allTextContents()
  check('Booking sheet offers exactly 10:00–13:30 tomorrow', times.join(',') === '10:00,10:30,11:00,11:30,12:00,12:30,13:00,13:30', times.join(','))
  await bs.getByRole('button', { name: 'Close' }).click()

  // Access
  await owner.bringToFront()
  await owner.getByLabel('Gate PIN').fill('12')
  await owner.getByRole('button', { name: 'Save access' }).click()
  check('PIN must be 4 digits', await seen(owner.getByText('The PIN must be exactly 4 digits')))
  await owner.getByLabel('Gate PIN').fill('9999')
  await owner.getByLabel('Access instructions').fill('New gate code from today. Bay with the blue charger.')
  await owner.getByRole('button', { name: 'Save access' }).click()
  const sp = await owner.evaluate(() => JSON.parse(localStorage.getItem('pp.db')).spots.find((s) => s.id === 'sp_saikung_1'))
  check('Access saved (PIN 9999 + instructions)', (await seen(owner.getByText('Access details saved'))) && sp.accessPin === '9999' && sp.instructions.startsWith('New gate code'))
  await ctx.close()
}

// ── 4. Earnings empty state for an owner with no bookings ──
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const p = await tab(ctx, 'u_owner_4')
  await p.goto(BASE + '#/owner/earnings')
  check('Empty state: "No earnings yet — approve your first request"', await seen(p.getByText('No earnings yet — approve your first request')))
  await ctx.close()
}

await browser.close()
if (errors.length) results.push('FAIL  console/page errors: ' + [...new Set(errors)].join(' | '))
console.log(results.join('\n'))
console.log(`\n${results.filter((r) => r.startsWith('PASS')).length}/${results.length} passed`)
process.exit(results.some((r) => r.startsWith('FAIL')) ? 1 : 0)
