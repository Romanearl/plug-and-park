// Checks the S7 "done when" items. Run via `npm run check` (or with `npm run preview` running: node scripts/checks/s7.mjs)
import { chromium } from 'playwright'

const BASE = process.env.PP_BASE ?? 'http://localhost:4173/plug-and-park/'
const results = []
const check = (name, ok, extra = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? ' - ' + extra : ''}`)
const seen = (loc, timeout = 4000) => loc.waitFor({ timeout }).then(() => true, () => false)
const IGNORE = /tile\.openstreetmap|basemaps\.cartocdn|fonts\.g|ERR_FAILED|net::/
// 1×1 red PNG for the upload test
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==', 'base64')

const browser = await chromium.launch()
const errors = []
async function tab(ctx, user) {
  const p = await ctx.newPage()
  p.on('pageerror', (e) => errors.push(e.message))
  p.on('console', (m) => m.type() === 'error' && !IGNORE.test(m.text()) && errors.push(m.text()))
  if (user)
    await p.addInitScript((uid) => {
      try {
        sessionStorage.getItem('pp.session.main') || sessionStorage.setItem('pp.session.main', uid)
      } catch {}
    }, user)
  return p
}
const dbOf = (p) => p.evaluate(() => JSON.parse(localStorage.getItem('pp.db')))
const next = (p) => p.getByRole('button', { name: /^(Next|Submit application|Resubmit application)$/ }).click()
async function demoSheet(p) {
  await p.getByRole('button', { name: /Demo only/ }).click()
  await p.getByRole('dialog', { name: 'Demo controls' }).waitFor()
  return p.getByRole('dialog', { name: 'Demo controls' })
}

// ── 1. New owner: sign up → apply → changes → resubmit → approve → setup → live ──
let newSpotId = null
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const owner = await tab(ctx)
  await owner.goto(BASE + '#/register?role=owner')
  await owner.getByLabel('Full name').fill('Ho Wing Sze')
  await owner.getByLabel('Email').fill('ho.wingsze@example.com')
  await owner.getByLabel('Mobile number').fill('98765432')
  await owner.getByLabel('Password', { exact: true }).fill('Charge2026')
  await owner.getByLabel('Confirm password').fill('Charge2026')
  await owner.getByText('I agree to the Terms').click()
  await owner.getByRole('button', { name: 'Continue' }).click()
  await owner.waitForURL(/#\/verify$/)
  await owner.getByLabel('Digit 1 of 6').waitFor()
  await owner.keyboard.type('123456')
  await owner.waitForFunction(() => location.hash === '#/owner', null, { timeout: 5000 }).catch(async () => {
    console.log('URL after verify:', owner.url(), JSON.stringify(await owner.evaluate(() => ({ active: document.activeElement?.getAttribute('aria-label'), boxes: [...document.querySelectorAll('.otp-box')].map((b) => b.value).join(''), err: document.querySelector('.field-error')?.textContent }))))
    await owner.screenshot({ path: 'C:/Users/kotya/AppData/Local/Temp/claude/10ad7140ab82beec/322c85ba-844e-4dd3-af43-15a6c18f0f5e/scratchpad/s7-verify.png' })
  })
  check('New owner → welcome card', await seen(owner.getByText('List your charger and earn while you’re at work')))
  await owner.getByRole('button', { name: 'List my charger' }).click()
  await owner.waitForURL(/#\/owner\/apply$/)

  // Step 1 validation + draft survives reload
  check('Apply: "Step 1 of 3" progress', await seen(owner.getByText('Step 1 of 3')))
  await next(owner)
  for (const t of ['Give your bay a title of 5–60 characters', 'Enter the address (5–120 characters)', 'Choose a district', 'Choose the property type', 'Drag the pin to your bay']) check(`Step 1 error: ${t}`, await seen(owner.locator('.field-error', { hasText: t }).first()))
  await owner.getByLabel('Title').fill('Ho family garage — Pak Tam Chung')
  await owner.getByLabel('Address').fill('Pak Tam Road, Sai Kung')
  await owner.getByLabel('District').selectOption('Sai Kung')
  check('District → mini map with draggable pin', await seen(owner.locator('.mini-map .pin')))
  await owner.getByRole('radio', { name: 'Village house' }).click()
  await owner.reload()
  check('Step 1 draft survives a reload', (await owner.getByLabel('Title').inputValue()) === 'Ho family garage — Pak Tam Chung' && (await owner.getByLabel('District').inputValue()) === 'Sai Kung')
  // Drag the pin a little
  const pin = owner.locator('.mini-map .pin')
  const pb = await pin.boundingBox()
  await owner.mouse.move(pb.x + pb.width / 2, pb.y + pb.height / 2)
  await owner.mouse.down()
  await owner.mouse.move(pb.x + pb.width / 2 + 30, pb.y + pb.height / 2 + 10, { steps: 6 })
  await owner.mouse.up()
  await next(owner)

  // Step 2
  check('Step 2 of 3', await seen(owner.getByText('Step 2 of 3')))
  await next(owner)
  check('Step 2 error: connector', await seen(owner.getByText('Choose the connector type')))
  await owner.getByRole('radio', { name: 'Type 2' }).click()
  await owner.getByLabel('Power').selectOption('7.4')
  check('Tip: "Similar bays in Sai Kung charge HK$23–25"', await seen(owner.getByText(/Similar bays in Sai Kung charge HK\$23–25/)))
  await owner.getByRole('button', { name: 'Raise price' }).click()
  check('Price line uses the money rules (HK$26 → about HK$20.54)', await seen(owner.getByText('Drivers pay HK$26/hour · you receive about HK$20.54')))
  await owner.reload()
  check('Step 2 survives a reload', await seen(owner.getByText('Step 2 of 3')))
  await next(owner)

  // Step 3
  await next(owner)
  check('Step 3 errors: photo + confirm', (await seen(owner.getByText('Add at least one photo'))) && (await seen(owner.getByText('Please confirm you have the right to rent out this bay'))))
  await owner.locator('input[data-photo-input="0"]').setInputFiles({ name: 'bay.png', mimeType: 'image/png', buffer: PNG })
  check('Uploaded photo is stored as a compressed JPEG data URL', await seen(owner.locator('.photo-tile img[src^="data:image/jpeg"]')))
  await owner.getByRole('button', { name: 'Use sample photo' }).click()
  check('Use sample photo fills the next tile', (await owner.locator('.photo-tile svg').count()) >= 1)
  check('Hours preset: Mon–Fri 08:30–19:00', await seen(owner.getByLabel('Summary').getByText('Mon–Fri 08:30–19:00')))
  await owner.getByText('I confirm I have the right').click()
  await next(owner)
  check('Submitting… loading state', await seen(owner.getByText('Submitting…'), 800))
  check('"Application received" + timeline', (await seen(owner.getByText('Application received'))) && (await seen(owner.getByText('Under review by Plug & Park'))))
  let db = await dbOf(owner)
  const sp = db.spots.find((s) => s.title === 'Ho family garage — Pak Tam Chung')
  newSpotId = sp?.id
  check('Saved as in_review, inactive, with photos + availability + pin location', !!sp && sp.reviewStatus === 'in_review' && !sp.active && sp.photos.length === 2 && sp.availability.length === 5 && sp.lat !== 22.381)

  // Drivers can't see or book it
  const driver = await tab(ctx, 'u_driver_demo')
  await driver.goto(BASE + '#/app')
  await driver.locator('.pin').first().waitFor()
  check('In-review spot is not on the driver map', (await driver.locator(`.pin[data-spot="${newSpotId}"], .pin[data-spots~="${newSpotId}"]`).count()) === 0 && (await driver.evaluate(() => [...document.querySelectorAll('.pin')].reduce((n, el) => n + Number(el.dataset.count ?? 1), 0))) === 12)
  await driver.goto(BASE + `#/app/spot/${newSpotId}`)
  check('In-review spot can\'t be opened/booked', await seen(driver.getByText('This charger is no longer listed')))

  // Platform: request changes (the No branch)
  await owner.bringToFront()
  await owner.getByRole('button', { name: 'Back to home' }).click()
  check('Owner home: "Application under review" card', await seen(owner.getByText('Application under review')))
  let sheet = await demoSheet(owner)
  await sheet.locator(`[data-admin-spot="${newSpotId}"]`).getByRole('button', { name: 'Request changes' }).click()
  await sheet.getByRole('button', { name: 'Close' }).click()
  check('Changes requested → toast + amber card with note', (await seen(owner.getByText('Plug & Park asked for changes').first())) && (await seen(owner.getByText('Please add a clearer photo of the charger'))))
  await owner.getByRole('button', { name: 'Edit application' }).click()
  check('Edit application → pre-filled form', (await seen(owner.getByText(/Editing your application/))) && (await owner.getByLabel('Title').inputValue()) === 'Ho family garage — Pak Tam Chung')
  await next(owner)
  await next(owner)
  await next(owner)
  check('Resubmit works', await seen(owner.getByText('Application resubmitted')))
  db = await dbOf(owner)
  check('Back to in_review after resubmit', db.spots.find((s) => s.id === newSpotId).reviewStatus === 'in_review')

  // Platform: approve (Yes) → finish setup → go live
  await owner.getByRole('button', { name: 'Back to home' }).click()
  sheet = await demoSheet(owner)
  // Record every toast text (toasts are transient, so a late look could miss one).
  await owner.evaluate(() => {
    window.__toasts = []
    new MutationObserver(() => document.querySelectorAll('.notify-toast').forEach((t) => window.__toasts.push(t.textContent))).observe(document.body, { childList: true, subtree: true })
  })
  await sheet.locator(`[data-admin-spot="${newSpotId}"]`).getByRole('button', { name: 'Approve' }).click()
  await sheet.getByRole('button', { name: 'Close' }).click()
  const card = await seen(owner.getByText('You’re approved — one last step'))
  const toastSeen = await owner.waitForFunction(() => window.__toasts.some((t) => t.includes('You’re approved — finish setup to go live')), null, { timeout: 4000 }).then(() => true, () => false)
  check('Approved → toast + "one last step" card', card && toastSeen)
  db = await dbOf(owner)
  check('Approved but not live until setup', db.spots.find((s) => s.id === newSpotId).active === false)
  await owner.getByRole('button', { name: 'Finish setup' }).click()
  await owner.waitForURL(new RegExp(`#/owner/setup/${newSpotId}$`))
  await owner.getByRole('button', { name: 'Go live' }).click()
  check('Setup validation: PIN + instructions', (await seen(owner.getByText('The PIN must be exactly 4 digits'))) && (await seen(owner.getByText(/Add short access instructions/))))
  await owner.getByLabel('Gate PIN (4 digits)').fill('2468')
  await owner.getByLabel('Access instructions').fill('Blue roller door, bay on the left.')
  check('Payout FPS pre-filled with the owner phone', (await owner.getByLabel('FPS ID (mobile or email)').inputValue()) === '+852 9876 5432')
  await driver.bringToFront()
  await driver.goto(BASE + '#/app')
  await driver.locator('.pin').first().waitFor()
  await owner.bringToFront()
  await owner.getByRole('button', { name: 'Go live' }).dblclick()
  check('Go live → My spots + "Your charger is live"', (await seen(owner.getByText('Your charger is live'), 3000)) && owner.url().endsWith('#/owner/spots'))
  db = await dbOf(owner)
  const live = db.spots.find((s) => s.id === newSpotId)
  const ownerUser = db.users.find((u) => u.email === 'ho.wingsze@example.com')
  check('Spot approved + active, PIN saved, payout method masked', live.reviewStatus === 'approved' && live.active && live.accessPin === '2468' && ownerUser.payoutMethod.label === 'FPS •••• 5432')
  check('New pin appears live on the driver map', await seen(driver.locator(`.pin[data-spot="${newSpotId}"], .pin[data-spots~="${newSpotId}"]`), 2000))
  await ctx.close()
}

// ── 2. The four "No" branches, end to end ──
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const owner = await tab(ctx, 'u_owner_demo')
  await owner.goto(BASE + '#/owner')
  const driver = await tab(ctx, 'u_driver_demo')
  const sheet0 = await (async () => {
    await driver.goto(BASE + '#/')
    const s = await demoSheet(driver)
    return s
  })()
  check('Demo sheet lists the four "No" branches', (await sheet0.getByText('Spot unavailable').count()) === 1 && (await sheet0.getByText('Owner declines').count()) === 1 && (await sheet0.getByText('Payment fails').count()) === 1 && (await sheet0.getByText('Application needs changes').count()) === 1)
  await sheet0.getByRole('button', { name: 'Close' }).click()
  const before = (await dbOf(driver)).bookings.length
  const request = async (time) => {
    await driver.bringToFront()
    await driver.goto(BASE + '#/app/spot/sp_kwuntong_1')
    const s = driver.getByRole('dialog', { name: 'Request booking' })
    if (!(await s.isVisible().catch(() => false))) await driver.getByRole('button', { name: 'Request booking', exact: true }).click()
    await s.getByRole('button', { name: 'Tomorrow', exact: true }).click()
    await s.getByRole('button', { name: time, exact: true }).click()
    await s.getByRole('button', { name: '1 h', exact: true }).click()
    await s.getByRole('button', { name: /^Request booking ·/ }).dblclick() // double tap must not create two
    return s
  }
  // 1. Spot unavailable
  const s1 = await request('10:00')
  check('No #1 Spot unavailable: notice, nothing created', (await seen(s1.getByText('This slot is no longer available'), 4000)) && (await dbOf(driver)).bookings.length === before)
  // 2. Owner declines
  await request('13:00')
  await driver.waitForURL(/#\/app\/booking\//, { timeout: 5000 })
  const id = driver.url().split('/').pop()
  check('Double tap on Request created exactly one booking', (await dbOf(driver)).bookings.length === before + 1)
  await owner.bringToFront()
  await owner.locator(`.request-card[data-booking="${id}"]`).getByRole('button', { name: 'Decline' }).click({ timeout: 5000 })
  await owner.getByRole('button', { name: 'I need the bay myself' }).click()
  check('No #2 Owner declines: driver sees declined live', await seen(driver.locator('.status-card[data-status="declined"]'), 3000))
  // 3. Payment fails
  await driver.bringToFront()
  await request('15:00')
  await driver.waitForURL(/#\/app\/booking\//, { timeout: 5000 })
  const id2 = driver.url().split('/').pop()
  await owner.bringToFront()
  await owner.locator(`.request-card[data-booking="${id2}"]`).getByRole('button', { name: 'Approve' }).click({ timeout: 5000 })
  await driver.bringToFront()
  await driver.getByRole('button', { name: 'Pay HK$30' }).click()
  await driver.getByRole('button', { name: 'Use test card' }).click()
  await driver.getByLabel('Card number', { exact: true }).fill('4000000000000002')
  await driver.getByRole('button', { name: 'Pay HK$30' }).dblclick()
  check('No #3 Payment fails: declined banner, booking still payable', (await seen(driver.getByText('Your card was declined. Try another card.'), 5000)) && (await dbOf(driver)).bookings.find((b) => b.id === id2).status === 'confirmed')
  // 4. Application needs changes → covered end to end in section 1
  check('No #4 Application needs changes: covered in the onboarding flow', newSpotId !== null)
  await ctx.close()
}

// ── 3. State sweep: unknown ids, double taps, resets, removed user, long names ──
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const d = await tab(ctx, 'u_driver_demo')
  await d.goto(BASE + '#/app/booking/nope')
  check('Unknown booking → "Booking not found"', await seen(d.getByText('Booking not found')))
  await d.goto(BASE + '#/app/pay/nope')
  await d.waitForTimeout(400)
  check('Unknown pay id → redirected to Bookings', d.url().endsWith('#/app/bookings'))
  for (const r of ['confirm', 'session', 'rate']) {
    await d.goto(BASE + `#/app/${r}/nope`)
    await d.waitForTimeout(300)
    check(`Unknown ${r} id → redirected to Bookings`, d.url().endsWith('#/app/bookings'))
  }
  // Reset while on a screen → lands on #/
  await d.goto(BASE + '#/app/account')
  const s = await demoSheet(d)
  await s.getByRole('button', { name: 'Reset demo' }).click()
  await s.getByRole('button', { name: 'Tap again to wipe all demo data' }).click()
  check('Reset while on a screen → #/', (await seen(d.getByText('Charge where'))) && d.url().endsWith('#/'))
  await ctx.close()

  const c2 = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const o = await tab(c2, 'u_owner_demo')
  await o.goto(BASE + '#/owner/spots/nope')
  check('Unknown spot (owner) → "Spot not found"', await seen(o.getByText('Spot not found')))
  await o.goto(BASE + '#/owner/setup/nope')
  check('Unknown setup id → "Nothing to set up here"', await seen(o.getByText('Nothing to set up here')))
  // Withdraw double tap → one payout
  await o.goto(BASE + '#/owner/earnings')
  await o.getByRole('button', { name: 'Withdraw', exact: true }).click()
  await o.getByRole('button', { name: /^Withdraw HK\$/ }).dblclick()
  await o.getByText(/On its way/).waitFor({ timeout: 3000 }).catch(() => {}) // after the "Sending…" step
  await o.waitForTimeout(400)
  check('Withdraw double tap → one payout', (await dbOf(o)).payouts.length === 1)
  await c2.close()

  // Removed user: a reset in another window signs this one out cleanly
  const c3 = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const a = await tab(c3)
  await a.goto(BASE + '#/register?role=driver')
  const longName = 'Maximilian Alexander Chan-Wong Tai-Man'
  await a.getByLabel('Full name').fill(longName)
  await a.getByLabel('Email').fill('long.name.person.with.a.very.long.address@example-company.com.hk')
  await a.getByLabel('Mobile number').fill('51234567')
  await a.getByLabel('Password', { exact: true }).fill('Charge2026')
  await a.getByLabel('Confirm password').fill('Charge2026')
  await a.getByText('I agree to the Terms').click()
  await a.getByRole('button', { name: 'Continue' }).click()
  await a.waitForURL(/#\/verify$/)
  await a.getByLabel('Digit 1 of 6').waitFor()
  await a.keyboard.type('123456')
  await a.waitForFunction(() => location.hash === '#/app', null, { timeout: 5000 })
  await a.goto(BASE + '#/app/account')
  const overflow = await a.evaluate(() => [...document.querySelectorAll('.scroll')].some((el) => el.scrollWidth > el.clientWidth + 1))
  check('Long name + email: no horizontal overflow on Account', !overflow && (await seen(a.getByText(longName))))
  const b = await tab(c3)
  await b.goto(BASE + '#/')
  const sb = await demoSheet(b)
  await sb.getByRole('button', { name: 'Reset demo' }).click()
  await sb.getByRole('button', { name: 'Tap again to wipe all demo data' }).click()
  await a.bringToFront()
  check('User removed by a reset elsewhere → signed out cleanly (login)', await seen(a.getByRole('heading', { name: 'Log in' }), 3000))
  check('…and the stale session is cleared', (await a.evaluate(() => sessionStorage.getItem('pp.session.main'))) === null)
  await c3.close()
}

await browser.close()
if (errors.length) results.push('FAIL  console/page errors: ' + [...new Set(errors)].join(' | '))
console.log(results.join('\n'))
console.log(`\n${results.filter((r) => r.startsWith('PASS')).length}/${results.length} passed`)
process.exit(results.some((r) => r.startsWith('FAIL')) ? 1 : 0)
