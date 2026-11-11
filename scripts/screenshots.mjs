// Playwright screenshot runner.
//
//   npm run shots -- S1        → shoots the S1 scenarios into "Claude outputs1/screenshots/S1/"
//   npm run shots -- all       → re-shoots every session
//
// Builds the app, starts `vite preview` on a fixed port, runs the scenarios in fresh
// browser contexts (clean storage), and always stops the server. Fails loudly on page
// errors or console errors (font and map-tile network errors are ignored).

import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'
import { BASE, ROOT, build, startPreview } from './lib/server.mjs'

const OUT_ROOT = path.join(ROOT, 'Claude outputs1', 'screenshots')

const PHONE = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
const desktop = (width, height) => ({ viewport: { width, height }, deviceScaleFactor: 1 })

// ── Helpers used by scenario setups ─────────────────────────────────────────

const openDemoSheet = async (page) => {
  await page.getByRole('button', { name: /Demo only/ }).click()
  await page.getByRole('dialog', { name: 'Demo controls' }).waitFor()
  await page.waitForTimeout(400) // let the slide-up finish
}

// ── Scenarios ───────────────────────────────────────────────────────────────
// Keep old sessions' scenarios: later sessions can re-shoot everything with `all`.

const scenarios = [
  { session: 'S1', file: '00-framed-1440x900', device: desktop(1440, 900), route: '#/' },
  { session: 'S1', file: '01-landing', route: '#/' },
  { session: 'S1', file: '02-demo-sheet', route: '#/', setup: openDemoSheet },
  {
    session: 'S1',
    file: '03-demo-sheet-reset-confirm',
    route: '#/',
    setup: async (page) => {
      await openDemoSheet(page)
      await page.getByRole('button', { name: 'Reset demo' }).click()
      await page.getByRole('button', { name: 'Tap again to wipe all demo data' }).waitFor()
    },
  },
  {
    session: 'S1',
    file: '04-owner-placeholder',
    route: '#/',
    setup: async (page) => {
      await openDemoSheet(page)
      await page.getByRole('button', { name: 'Sign in as charger owner' }).click()
      await page.waitForURL(/#\/owner$/)
      await page.getByRole('heading', { name: 'Hi, Mei Ling' }).waitFor()
    },
  },
  { session: 'S1', file: '05-register-placeholder', route: '#/register' },
  { session: 'S1', file: '06-framed-1280x720', device: desktop(1280, 720), route: '#/' },

  // ── S2: auth ──
  { session: 'S2', file: '01-register-empty', route: '#/register' },
  {
    session: 'S2',
    file: '02-register-errors-top',
    route: '#/register?role=driver',
    setup: async (page) => {
      await page.getByLabel('Full name').fill('Chan Tai Man')
      await page.getByLabel('Email').fill('chan@mail')
      await page.getByLabel('Mobile number').fill('1234')
      await page.getByRole('button', { name: 'Continue' }).click({ force: true })
      await page.getByText('Enter a valid email').waitFor()
    },
  },
  {
    session: 'S2',
    file: '03-register-errors-password',
    route: '#/register?role=driver',
    setup: async (page) => {
      await page.getByLabel('Full name').fill('Chan Tai Man')
      await page.getByLabel('Email').fill('chan@mail')
      await page.getByLabel('Password', { exact: true }).fill('demo12')
      await page.getByLabel('Confirm password').fill('demo13')
      await page.getByRole('button', { name: 'Continue' }).click({ force: true })
      await page.getByText('Passwords don’t match').waitFor()
      await page.getByLabel('Email').scrollIntoViewIfNeeded()
      await page.locator('.scroll').evaluate((el) => el.scrollBy(0, 150))
    },
  },
  {
    session: 'S2',
    file: '04-register-valid',
    route: '#/register?role=driver',
    setup: async (page) => {
      await fillRegistration(page, 'new.driver@example.com')
      await page.getByRole('button', { name: 'Continue' }).scrollIntoViewIfNeeded()
    },
  },
  {
    session: 'S2',
    file: '05-register-duplicate-email',
    route: '#/register?role=driver',
    setup: async (page) => {
      await page.getByLabel('Email').fill('driver@plugpark.demo')
      await page.getByLabel('Email').blur()
      await page.getByText('An account with this email already exists').waitFor()
    },
  },
  {
    session: 'S2',
    file: '06-login-error',
    route: '#/login',
    setup: async (page) => {
      await page.getByLabel('Email').fill('driver@plugpark.demo')
      await page.getByLabel('Password', { exact: true }).fill('WrongPass1')
      await page.getByRole('button', { name: 'Log in', exact: true }).click()
      await page.getByText('Email or password is incorrect').waitFor()
    },
  },
  {
    session: 'S2',
    file: '07-login-demo-filled',
    route: '#/login',
    setup: async (page) => {
      await page.getByRole('button', { name: 'Demo driver' }).click()
    },
  },
  {
    session: 'S2',
    file: '08-login-forgot-sheet',
    route: '#/login',
    setup: async (page) => {
      await page.getByRole('button', { name: 'Forgot password?' }).click()
      await page.getByRole('dialog', { name: 'Forgot password?' }).waitFor()
      await page.waitForTimeout(400)
    },
  },
  { session: 'S2', file: '09-verify-empty', route: '#/login', setup: async (page) => loginAsDemo(page) },
  {
    session: 'S2',
    file: '10-verify-wrong-code',
    route: '#/login',
    setup: async (page) => {
      await loginAsDemo(page)
      await page.keyboard.type('654321')
      await page.getByText('That code isn’t right').waitFor()
    },
  },
  {
    session: 'S2',
    file: '11-verify-success',
    route: '#/register?role=driver',
    setup: async (page) => {
      await registerNewDriver(page)
      await page.keyboard.type('123456')
      await page.getByText('Verified').waitFor()
    },
    settle: 0,
  },
  {
    session: 'S2',
    file: '12-app-new-user',
    route: '#/register?role=driver',
    setup: async (page) => {
      await registerNewDriver(page)
      await page.keyboard.type('123456')
      await page.waitForURL(/#\/app$/)
      await page.goto(BASE + '#/app/account') // S3: name shown on Account
      await page.getByText('Ho Ka Yan').waitFor()
    },
  },
]

// ── S3: discovery ──
const asDriver = (context) =>
  context.addInitScript(() => {
    if (!sessionStorage.getItem('pp.session.main')) sessionStorage.setItem('pp.session.main', 'u_driver_demo')
  })
const blockTiles = (context) => context.route(/tile\.openstreetmap\.org|basemaps\.cartocdn\.com/, (route) => route.abort())

async function waitForMap(page) {
  await page.locator('.pin').first().waitFor()
  await page
    .waitForFunction(() => document.querySelectorAll('.leaflet-tile-loaded').length >= 6, null, { timeout: 15000 })
    .catch(() => console.warn('  ! map tiles did not load (offline?)'))
  await page.waitForTimeout(500)
}
const tapPin = (page, id) => page.locator(`.pin[data-spot="${id}"]`).click()
const chip = (page, name) => page.getByRole('toolbar', { name: 'Filters' }).getByRole('button', { name, exact: true }).click()

scenarios.push(
  { session: 'S3', file: '01-map-all-pins', route: '#/app', init: asDriver, setup: waitForMap },
  {
    session: 'S3',
    file: '02-map-ccs2-filter',
    route: '#/app',
    init: asDriver,
    setup: async (page) => {
      await waitForMap(page)
      await chip(page, 'CCS2')
    },
  },
  {
    session: 'S3',
    file: '03-district-sheet',
    route: '#/app',
    init: asDriver,
    setup: async (page) => {
      await waitForMap(page)
      await page.getByRole('button', { name: /Where do you need to charge/ }).click()
      await page.getByRole('dialog', { name: 'Choose a district' }).waitFor()
      await page.waitForTimeout(400)
    },
  },
  {
    session: 'S3',
    file: '04-pin-selected-preview',
    route: '#/app',
    init: asDriver,
    setup: async (page) => {
      await waitForMap(page)
      await tapPin(page, 'sp_kwuntong_1')
      await page.locator('.spot-preview').waitFor()
      await page.waitForTimeout(1200) // fly-to + tiles
    },
  },
  {
    session: 'S3',
    file: '05-sheet-full-list',
    route: '#/app',
    init: asDriver,
    setup: async (page) => {
      await waitForMap(page)
      await page.getByRole('button', { name: /Resize sheet/ }).click()
      await page.getByRole('button', { name: /Resize sheet/ }).click()
      await page.waitForTimeout(500)
    },
  },
  {
    session: 'S3',
    file: '06-no-results',
    route: '#/app',
    init: asDriver,
    setup: async (page) => {
      await waitForMap(page)
      await chip(page, 'CCS2')
      await chip(page, 'Under $25')
      await page.getByText('No chargers match these filters').waitFor()
    },
  },
  {
    session: 'S3',
    file: '07-tile-failure-fallback',
    route: '#/app',
    init: async (context) => {
      await asDriver(context)
      await blockTiles(context)
    },
    setup: async (page) => {
      await page.getByText('Map unavailable — showing list').waitFor({ timeout: 10000 })
      await page.waitForTimeout(500)
    },
  },
  {
    session: 'S3',
    file: '08-spot-details-top',
    route: '#/app/spot/sp_kwuntong_1',
    init: asDriver,
  },
  {
    session: 'S3',
    file: '09-spot-details-reviews',
    route: '#/app/spot/sp_kwuntong_1',
    init: asDriver,
    setup: async (page) => {
      await page.locator('#reviews').evaluate((el) => el.scrollIntoView({ block: 'start' }))
      await page.waitForTimeout(300)
    },
  },
  { session: 'S3', file: '10-bookings-empty', route: '#/app/bookings', init: asDriver },
  { session: 'S3', file: '11-account', route: '#/app/account', init: asDriver },
  {
    session: 'S3',
    file: '12-framed-1280x720-selected',
    device: desktop(1280, 720),
    route: '#/app',
    init: asDriver,
    setup: async (page) => {
      await waitForMap(page)
      await tapPin(page, 'sp_shatin_1')
      await page.locator('.spot-preview').waitFor()
      await page.waitForTimeout(1200)
    },
  },
  {
    session: 'S3',
    file: '13-spot-details-weekend-ac',
    route: '#/app/spot/sp_saikung_2',
    init: asDriver,
    setup: async (page) => {
      await page.locator('#reviews').evaluate((el) => el.scrollIntoView({ block: 'end' }))
      await page.locator('.scroll').evaluate((el) => el.scrollBy(0, -420))
    },
  },
)

// ── S4: booking core ──
const asOwner = (context) =>
  context.addInitScript(() => {
    try {
      if (!sessionStorage.getItem('pp.session.main')) sessionStorage.setItem('pp.session.main', 'u_owner_demo')
    } catch {}
  })

/** Opens the booking sheet on Kwun Tong and picks tomorrow / time / duration (doesn't submit). */
async function pickSlot(page, time, dur = '1 h') {
  const sheet = page.getByRole('dialog', { name: 'Request booking' })
  if (!(await sheet.isVisible().catch(() => false))) await page.getByRole('button', { name: 'Request booking' }).click()
  await sheet.getByRole('button', { name: 'Tomorrow', exact: true }).click()
  await sheet.getByRole('button', { name: time, exact: true }).click()
  await sheet.getByRole('button', { name: dur, exact: true }).click()
  return sheet
}
async function requestSlot(page, time) {
  const sheet = await pickSlot(page, time)
  await sheet.getByRole('button', { name: /^Request booking ·/ }).click()
  await page.waitForURL(/#\/app\/booking\/bk_/, { timeout: 6000 })
  return page.url().split('/').pop()
}
/** A second tab in the same browser, signed in as someone else (localStorage is shared, sessions aren't). */
async function otherTab(page, userId, route) {
  const p2 = await page.context().newPage()
  await p2.goto(BASE + '#/')
  await p2.evaluate((u) => sessionStorage.setItem('pp.session.main', u), userId)
  await p2.goto('about:blank')
  await p2.goto(BASE + route)
  return p2
}
const KT = '#/app/spot/sp_kwuntong_1'

scenarios.push(
  { session: 'S4', file: '01-booking-sheet', route: KT, init: asDriver, setup: async (page) => { await page.getByRole('button', { name: 'Request booking' }).click(); await page.waitForTimeout(400) } },
  { session: 'S4', file: '02-booking-sheet-slot-chosen', route: KT, init: asDriver, setup: async (page) => { await pickSlot(page, '13:00') } },
  {
    session: 'S4', file: '03-checking-availability', route: KT, init: asDriver, settle: 0,
    setup: async (page) => {
      const sheet = await pickSlot(page, '10:00')
      await sheet.getByRole('button', { name: /^Request booking ·/ }).click()
      await sheet.getByText('Checking availability…').waitFor()
    },
  },
  {
    session: 'S4', file: '04-slot-unavailable-suggestions', route: KT, init: asDriver,
    setup: async (page) => {
      const sheet = await pickSlot(page, '10:00')
      await sheet.getByRole('button', { name: /^Request booking ·/ }).click()
      await sheet.getByText('This slot is no longer available').waitFor()
      await sheet.locator('.notice').scrollIntoViewIfNeeded()
    },
  },
  { session: 'S4', file: '05-status-pending', route: KT, init: asDriver, setup: async (page) => { await requestSlot(page, '13:00') } },
  {
    session: 'S4', file: '06-status-confirmed', route: KT, init: asDriver,
    setup: async (page) => {
      const id = await requestSlot(page, '13:00')
      const owner = await otherTab(page, 'u_owner_demo', '#/owner')
      await owner.locator(`.request-card[data-booking="${id}"]`).getByRole('button', { name: 'Approve' }).click()
      await page.locator('.status-card[data-status="confirmed"]').waitFor()
      await page.locator('.notify-toast').waitFor({ state: 'detached', timeout: 7000 })
    },
  },
  {
    session: 'S4', file: '07-toast-notification', route: KT, init: asDriver,
    setup: async (page) => {
      const id = await requestSlot(page, '13:00')
      const owner = await otherTab(page, 'u_owner_demo', '#/owner')
      await owner.locator(`.request-card[data-booking="${id}"]`).getByRole('button', { name: 'Approve' }).click()
      await page.getByText('Booking approved — pay to confirm').waitFor()
    },
  },
  {
    session: 'S4', file: '08-status-declined', route: KT, init: asDriver,
    setup: async (page) => {
      const id = await requestSlot(page, '13:00')
      const owner = await otherTab(page, 'u_owner_demo', '#/owner')
      await owner.locator(`.request-card[data-booking="${id}"]`).getByRole('button', { name: 'Decline' }).click()
      await owner.getByRole('button', { name: 'Charger under maintenance' }).click()
      await page.locator('.status-card[data-status="declined"]').waitFor()
      await page.locator('.notify-toast').waitFor({ state: 'detached', timeout: 7000 })
    },
  },
  {
    session: 'S4', file: '09-owner-requests-2-pending', route: '#/owner', init: asOwner,
    setup: async (page) => {
      const driver = await otherTab(page, 'u_driver_demo', KT)
      await requestSlot(driver, '13:00')
      await page.getByText('2 requests waiting').waitFor()
      await page.locator('.notify-toast').waitFor({ state: 'detached', timeout: 7000 })
    },
  },
  {
    session: 'S4', file: '10-decline-reason-sheet', route: '#/owner', init: asOwner,
    setup: async (page) => {
      await page.locator('.request-card').first().getByRole('button', { name: 'Decline' }).click()
      await page.getByRole('dialog', { name: 'Decline request' }).waitFor()
      await page.waitForTimeout(400)
    },
  },
  {
    session: 'S4', file: '11-owner-upcoming-after-approve', route: '#/owner', init: asOwner,
    setup: async (page) => {
      await page.locator('.request-card').first().getByRole('button', { name: 'Approve' }).click()
      await page.waitForTimeout(1400)
      await page.getByText('Awaiting payment').waitFor()
    },
  },
  {
    session: 'S4', file: '12-owner-empty', route: '#/owner', init: asOwner,
    setup: async (page) => {
      await page.locator('.request-card').first().getByRole('button', { name: 'Decline' }).click()
      await page.getByRole('button', { name: 'I need the bay myself' }).click()
      await page.getByText('No requests right now').waitFor()
    },
  },
  {
    session: 'S4', file: '13-presenter-1280x720-before-approve', device: desktop(1280, 720), route: '#/presenter',
    setup: async (page) => presenterRequest(page),
  },
  {
    session: 'S4', file: '14-presenter-1280x720-after-approve', device: desktop(1280, 720), route: '#/presenter',
    setup: async (page) => {
      const id = await presenterRequest(page)
      const o = page.frameLocator('iframe[name="owner"]')
      await o.locator(`.request-card[data-booking="${id}"]`).getByRole('button', { name: 'Approve' }).click()
      await page.frameLocator('iframe[name="driver"]').getByText('Approved! Pay to confirm your booking').waitFor()
      await page.waitForTimeout(800)
    },
  },
)

async function presenterRequest(page) {
  const d = page.frameLocator('iframe[name="driver"]')
  await d.locator('.pin').first().waitFor({ timeout: 10000 })
  const df = page.frame({ name: 'driver' })
  await df.evaluate(() => (location.hash = '#/app/spot/sp_kwuntong_1'))
  const sheet = await pickSlot(d, '13:00')
  await sheet.getByRole('button', { name: /^Request booking ·/ }).click()
  await df.waitForURL(/#\/app\/booking\/bk_/, { timeout: 6000 })
  const id = df.url().split('/').pop()
  await page.frameLocator('iframe[name="owner"]').locator(`.request-card[data-booking="${id}"]`).waitFor()
  await page.waitForTimeout(5000) // let the owner's "New booking request" toast clear
  return id
}

// ── S5: driver path ──
/** Puts a Kwun Tong booking (tomorrow 13:00, 1 h) for the demo driver into the DB, reloads, returns its id. */
async function seedBooking(page, patch = {}, startedAgoMs) {
  const id = await page.evaluate(
    ({ patch, startedAgoMs }) => {
      const db = JSON.parse(localStorage.getItem('pp.db'))
      const start = new Date()
      start.setDate(start.getDate() + 1)
      start.setHours(13, 0, 0, 0)
      const id = 'bk_shot' + Math.random().toString(36).slice(2, 6)
      const now = new Date().toISOString()
      const extra = startedAgoMs != null ? { startedAt: new Date(Date.now() - startedAgoMs).toISOString() } : {}
      db.bookings.push({ id, spotId: 'sp_kwuntong_1', driverId: 'u_driver_demo', ownerId: 'u_owner_demo', start: start.toISOString(), durationMinutes: 60, price: 30, commissionRate: 0.18, status: 'confirmed', createdAt: now, updatedAt: now, ...extra, ...patch })
      localStorage.setItem('pp.db', JSON.stringify(db))
      return id
    },
    { patch, startedAgoMs },
  )
  return id
}
const PAID = { status: 'paid', paymentLast4: '4242', pin: '7350', paidAt: new Date().toISOString() }
async function openPay(page) {
  const id = await seedBooking(page)
  await page.goto(BASE + `#/app/pay/${id}`)
  await page.reload()
  await page.getByLabel('Card number', { exact: true }).waitFor()
  return id
}
async function toSession(page, agoMs, waitRing = true) {
  const id = await seedBooking(page, { ...PAID, qrPayload: 'x', status: 'active' }, agoMs)
  await page.goto(BASE + `#/app/session/${id}`)
  await page.reload()
  if (waitRing) await page.locator('.ring-wrap').waitFor()
  return id
}
async function completedBooking(page, reviewed = false) {
  const id = await seedBooking(page, { ...PAID, qrPayload: 'x', status: 'completed', startedAt: new Date().toISOString(), completedAt: new Date().toISOString(), energyKwh: 50, reviewed })
  return id
}

scenarios.push(
  { session: 'S5', file: '01-payment-empty', route: '#/app/bookings', init: asDriver, setup: openPay },
  {
    session: 'S5', file: '02-payment-errors', route: '#/app/bookings', init: asDriver,
    setup: async (page) => {
      await openPay(page)
      await page.getByLabel('Card number', { exact: true }).fill('1234 5678 9012 3456')
      await page.getByLabel('Expiry', { exact: true }).fill('0120')
      await page.getByLabel('CVC', { exact: true }).fill('12')
      await page.getByRole('button', { name: 'Pay HK$30' }).click({ force: true })
      await page.getByText('Enter the name on the card').waitFor()
      await page.getByLabel('Card number', { exact: true }).scrollIntoViewIfNeeded()
    },
  },
  {
    session: 'S5', file: '03-payment-test-card', route: '#/app/bookings', init: asDriver,
    setup: async (page) => {
      await openPay(page)
      await page.getByRole('button', { name: 'Use test card' }).click()
      await page.getByRole('button', { name: 'Pay HK$30' }).scrollIntoViewIfNeeded()
    },
  },
  {
    session: 'S5', file: '04-payment-processing', route: '#/app/bookings', init: asDriver, settle: 0,
    setup: async (page) => {
      await openPay(page)
      await page.getByRole('button', { name: 'Use test card' }).click()
      await page.getByRole('button', { name: 'Pay HK$30' }).click()
      await page.getByText('Processing…').waitFor()
    },
  },
  {
    session: 'S5', file: '05-payment-declined', route: '#/app/bookings', init: asDriver,
    setup: async (page) => {
      await openPay(page)
      await page.getByRole('button', { name: 'Use test card' }).click()
      await page.getByLabel('Card number', { exact: true }).fill('4000000000000002')
      await page.getByRole('button', { name: 'Pay HK$30' }).click()
      await page.getByText('Your card was declined. Try another card.').waitFor()
      await page.locator('.scroll').evaluate((el) => el.scrollTo(0, 0))
    },
  },
  {
    session: 'S5', file: '06-confirmation-qr-pin', route: '#/app/bookings', init: asDriver,
    setup: async (page) => {
      await openPay(page)
      await page.getByRole('button', { name: 'Use test card' }).click()
      await page.getByRole('button', { name: 'Pay HK$30' }).click()
      await page.getByText("You're booked!").waitFor({ timeout: 6000 })
      await page.locator('.access-card').scrollIntoViewIfNeeded()
    },
  },
  { session: 'S5', file: '07-session-20pct', route: '#/app/bookings', init: asDriver, setup: (page) => toSession(page, 5_000), settle: 0 },
  { session: 'S5', file: '08-session-80pct', route: '#/app/bookings', init: asDriver, setup: (page) => toSession(page, 20_000), settle: 0 },
  {
    session: 'S5', file: '09-session-summary', route: '#/app/bookings', init: asDriver,
    setup: async (page) => {
      await toSession(page, 26_000, false)
      await page.getByText('Session complete').waitFor()
    },
  },
  {
    session: 'S5', file: '10-rate-empty', route: '#/app/bookings', init: asDriver,
    setup: async (page) => {
      const id = await completedBooking(page)
      await page.goto(BASE + `#/app/rate/${id}`)
      await page.reload()
      await page.getByText('How was your charge?').waitFor()
    },
  },
  {
    session: 'S5', file: '11-rate-filled', route: '#/app/bookings', init: asDriver,
    setup: async (page) => {
      const id = await completedBooking(page)
      await page.goto(BASE + `#/app/rate/${id}`)
      await page.reload()
      await page.getByRole('radio', { name: '5 stars' }).click()
      await page.getByRole('button', { name: 'Fast charging' }).click()
      await page.getByRole('button', { name: 'Helpful owner' }).click()
      await page.getByLabel('Tell other drivers more (optional)').fill('Guard showed me the bay, full in under an hour. Will be back!')
    },
  },
  {
    session: 'S5', file: '12-rate-thank-you', route: '#/app/bookings', init: asDriver,
    setup: async (page) => {
      const id = await completedBooking(page)
      await page.goto(BASE + `#/app/rate/${id}`)
      await page.reload()
      await page.getByRole('radio', { name: '5 stars' }).click()
      await page.getByLabel('Tell other drivers more (optional)').fill('Guard showed me the bay, full in under an hour. Will be back!')
      await page.getByRole('button', { name: 'Submit review' }).click()
      await page.getByText('Thanks for your review!').waitFor()
    },
  },
  {
    session: 'S5', file: '13-bookings-upcoming', route: '#/app/bookings', init: asDriver,
    setup: async (page) => {
      await seedBooking(page, { status: 'pending' })
      await seedBooking(page, {})
      await seedBooking(page, { ...PAID, qrPayload: 'x' })
      await page.reload()
      await page.locator('.booking-card').first().waitFor()
    },
  },
  {
    session: 'S5', file: '14-bookings-past', route: '#/app/bookings', init: asDriver,
    setup: async (page) => {
      await completedBooking(page, false)
      await seedBooking(page, { status: 'declined', declineReason: 'Other' })
      await page.reload()
      await page.getByRole('tab', { name: 'Past' }).click()
      await page.locator('.booking-card').first().waitFor()
    },
  },
  {
    session: 'S5', file: '15-owner-charging-now', route: '#/owner', init: asOwner,
    setup: async (page) => {
      await page.evaluate(() => {
        const db = JSON.parse(localStorage.getItem('pp.db'))
        const now = new Date().toISOString()
        db.bookings.push({ id: 'bk_shot_live', spotId: 'sp_kwuntong_1', driverId: 'u_driver_demo', ownerId: 'u_owner_demo', start: now, durationMinutes: 60, price: 30, commissionRate: 0.18, status: 'active', startedAt: now, paymentLast4: '4242', createdAt: now, updatedAt: now })
        localStorage.setItem('pp.db', JSON.stringify(db))
      })
      await page.reload()
      await page.getByText('Charging now').scrollIntoViewIfNeeded()
    },
  },
  {
    session: 'S5', file: '16-spot-details-new-review', route: '#/app/bookings', init: asDriver,
    setup: async (page) => {
      const id = await completedBooking(page)
      await page.goto(BASE + `#/app/rate/${id}`)
      await page.reload()
      await page.getByRole('radio', { name: '5 stars' }).click()
      await page.getByRole('button', { name: 'Fast charging' }).click()
      await page.getByLabel('Tell other drivers more (optional)').fill('Guard showed me the bay, full in under an hour. Will be back!')
      await page.getByRole('button', { name: 'Submit review' }).click()
      await page.goto(BASE + '#/app/spot/sp_kwuntong_1')
      await page.locator('#reviews').evaluate((el) => el.scrollIntoView({ block: 'start' }))
    },
  },
)

// ── S6: owner side ──
const asUser = (uid) => (context) =>
  context.addInitScript((u) => {
    try {
      if (!sessionStorage.getItem('pp.session.main')) sessionStorage.setItem('pp.session.main', u)
    } catch {}
  }, uid)
async function openWithdraw(page) {
  await page.getByRole('button', { name: 'Withdraw', exact: true }).click()
  await page.getByRole('dialog', { name: 'Withdraw' }).waitFor()
  await page.waitForTimeout(400)
  return page.getByRole('dialog', { name: 'Withdraw' })
}
async function withdrawFps(page) {
  const sheet = await openWithdraw(page)
  await sheet.getByRole('button', { name: /^Withdraw HK\$/ }).click()
  await page.getByText(/On its way/).waitFor()
}
const MANAGE = '#/owner/spots/sp_saikung_1'
const sched = (page) => page.getByRole('heading', { name: 'Availability' }).evaluate((el) => el.scrollIntoView({ block: 'start' }))

scenarios.push(
  { session: 'S6', file: '01-earnings', route: '#/owner/earnings', init: asOwner },
  {
    session: 'S6', file: '02-transaction-expanded', route: '#/owner/earnings', init: asOwner,
    setup: async (page) => {
      await page.locator('.tx-row[data-booking="bk_hist_1"] .tx-main').click()
      await page.locator('.tx-row[data-booking="bk_hist_1"]').evaluate((el) => el.scrollIntoView({ block: 'center' }))
    },
  },
  {
    session: 'S6', file: '03-pending-escrow', route: '#/owner/earnings', init: asOwner,
    setup: async (page) => page.getByRole('heading', { name: 'Pending' }).evaluate((el) => el.scrollIntoView({ block: 'start' })),
  },
  { session: 'S6', file: '04-withdraw-sheet-fps', route: '#/owner/earnings', init: asOwner, setup: openWithdraw },
  {
    session: 'S6', file: '05-withdraw-validation', route: '#/owner/earnings', init: asOwner,
    setup: async (page) => {
      const sheet = await openWithdraw(page)
      await sheet.getByRole('radio', { name: /Bank transfer/ }).click()
      await sheet.getByLabel('Account number').fill('12345678')
      await sheet.getByRole('button', { name: /^Withdraw HK\$/ }).click()
      await sheet.getByText('Enter a 9–12 digit account number').waitFor()
    },
  },
  { session: 'S6', file: '06-withdraw-success', route: '#/owner/earnings', init: asOwner, setup: withdrawFps },
  {
    session: 'S6', file: '07-payout-processing', route: '#/owner/earnings', init: asOwner,
    setup: async (page) => {
      await withdrawFps(page)
      await page.getByRole('button', { name: 'Done' }).click()
      await page.getByRole('heading', { name: 'Payouts' }).evaluate((el) => el.scrollIntoView({ block: 'start' }))
    },
  },
  {
    session: 'S6', file: '08-payout-paid', route: '#/owner/earnings', init: asOwner,
    setup: async (page) => {
      await withdrawFps(page)
      await page.getByRole('button', { name: 'Done' }).click()
      await page.locator('[data-payout]').first().getByText('Paid', { exact: true }).waitFor({ timeout: 12000 })
      await page.getByRole('heading', { name: 'Payouts' }).evaluate((el) => el.scrollIntoView({ block: 'start' }))
    },
  },
  { session: 'S6', file: '09-my-spots', route: '#/owner/spots', init: asOwner },
  {
    session: 'S6', file: '10-manage-price', route: MANAGE, init: asOwner,
    setup: async (page) => {
      for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Raise price' }).click()
    },
  },
  { session: 'S6', file: '11-scheduler-default', route: MANAGE, init: asOwner, setup: sched },
  {
    session: 'S6', file: '12-scheduler-error', route: MANAGE, init: asOwner,
    setup: async (page) => {
      await page.getByLabel('Monday to').selectOption('07:00')
      await sched(page)
    },
  },
  {
    session: 'S6', file: '13-scheduler-weekday-preset', route: MANAGE, init: asOwner,
    setup: async (page) => {
      await page.getByRole('switch', { name: 'Saturday available' }).check({ force: true })
      await page.getByRole('button', { name: 'Weekdays 08:30–19:00' }).click()
      await page.getByLabel('Summary').evaluate((el) => el.scrollIntoView({ block: 'end' }))
    },
  },
  {
    session: 'S6', file: '14-access-section', route: MANAGE, init: asOwner,
    setup: async (page) => page.getByRole('heading', { name: 'Access' }).evaluate((el) => el.scrollIntoView({ block: 'start' })),
  },
  {
    session: 'S6', file: '15-requests-history', route: '#/owner', init: asOwner,
    setup: async (page) => page.getByRole('heading', { name: 'History' }).evaluate((el) => el.scrollIntoView({ block: 'start' })),
  },
  { session: 'S6', file: '16-earnings-empty-new-owner', route: '#/owner/earnings', init: asUser('u_owner_4') },
  {
    session: 'S6', file: '17-presenter-session-ends-balance-moves', device: desktop(1280, 720), route: '#/presenter',
    setup: async (page) => {
      const d = page.frameLocator('iframe[name="driver"]')
      const o = page.frameLocator('iframe[name="owner"]')
      await d.locator('.pin').first().waitFor({ timeout: 10000 })
      await o.getByRole('heading', { name: 'Hi, Mei Ling' }).waitFor({ timeout: 10000 })
      const df = page.frame({ name: 'driver' })
      const of = page.frame({ name: 'owner' })
      await of.evaluate(() => (location.hash = '#/owner/earnings'))
      // A session that started 22 s ago: it finishes ~3 s after the driver opens it.
      // Write from the top page: the storage event then reaches both iframes (a window never gets its own).
      await page.evaluate(() => {
        const db = JSON.parse(localStorage.getItem('pp.db'))
        const now = Date.now()
        db.bookings.push({ id: 'bk_shot_end', spotId: 'sp_kwuntong_1', driverId: 'u_driver_demo', ownerId: 'u_owner_demo', start: new Date(now).toISOString(), durationMinutes: 60, price: 30, commissionRate: 0.18, status: 'active', paymentLast4: '4242', pin: '7350', paidAt: new Date(now).toISOString(), startedAt: new Date(now - 22_000).toISOString(), createdAt: new Date(now).toISOString(), updatedAt: new Date(now).toISOString() })
        localStorage.setItem('pp.db', JSON.stringify(db))
      })
      await page.waitForTimeout(300)
      await df.evaluate(() => (location.hash = '#/app/session/bk_shot_end'))
      await d.getByText('Session complete').waitFor({ timeout: 10000 })
      await o.getByText('HK$117.71').first().waitFor({ timeout: 5000 })
      await page.waitForTimeout(600)
    },
  },
)

// ── S7: onboarding + branches ──
/** Adds a brand-new owner (no spots) to the DB and signs this window in as them. */
async function newOwner(page) {
  await page.evaluate(() => {
    const db = JSON.parse(localStorage.getItem('pp.db'))
    if (!db.users.some((u) => u.id === 'u_owner_new'))
      db.users.push({ id: 'u_owner_new', role: 'owner', name: 'Ho Wing Sze', email: 'ho.wingsze@example.com', phone: '+852 9876 5432', passwordHash: 'x', verified: true, rating: 5, ratingCount: 0, createdAt: new Date().toISOString() })
    localStorage.setItem('pp.db', JSON.stringify(db))
    sessionStorage.setItem('pp.session.main', 'u_owner_new')
  })
  // A real page load (not a hash change) so the store reads the new session before the route guard runs.
  await page.goto('about:blank')
  await page.goto(BASE + '#/owner')
  await page.getByRole('heading', { name: 'Hi, Wing Sze' }).waitFor()
}
const applyNext = (page) => page.getByRole('button', { name: /^(Next|Submit application|Resubmit application)$/ }).click()
async function applyStep1(page) {
  await page.getByRole('button', { name: 'List my charger' }).click()
  await page.getByLabel('Title').fill('Ho family garage — Pak Tam Chung')
  await page.getByLabel('Address').fill('Pak Tam Road, Sai Kung')
  await page.getByLabel('District').selectOption('Sai Kung')
  await page.getByRole('radio', { name: 'Village house' }).click()
  await page.locator('.mini-map .leaflet-tile-loaded').first().waitFor({ timeout: 8000 }).catch(() => {})
}
async function applyStep2(page) {
  await applyStep1(page)
  await applyNext(page)
  await page.getByRole('radio', { name: 'Type 2' }).click()
  await page.getByRole('button', { name: 'Raise price' }).click()
  for (const a of ['Covered', 'Gated', 'Quiet street']) await page.getByRole('button', { name: a, exact: true }).click()
}
async function applyStep3(page) {
  await applyStep2(page)
  await applyNext(page)
  await page.getByRole('button', { name: 'Use sample photo' }).click()
  await page.getByRole('button', { name: 'Use sample photo' }).click()
  await page.getByText('I confirm I have the right').click()
}
async function submitApp(page) {
  await applyStep3(page)
  await applyNext(page)
  await page.getByText('Application received').waitFor()
  return page.evaluate(() => JSON.parse(localStorage.getItem('pp.db')).spots.find((s) => s.ownerId === 'u_owner_new').id)
}
async function platform(page, spotId, action) {
  await openDemoSheet(page)
  const sheet = page.getByRole('dialog', { name: 'Demo controls' })
  await sheet.locator(`[data-admin-spot="${spotId}"]`).getByRole('button', { name: action }).click()
  await sheet.getByRole('button', { name: 'Close' }).click()
}
async function approvedNewSpot(page) {
  const id = await submitApp(page)
  await page.getByRole('button', { name: 'Back to home' }).click()
  await platform(page, id, 'Approve')
  await page.getByText('You’re approved — one last step').waitFor()
  return id
}

scenarios.push(
  { session: 'S7', file: '01-new-owner-welcome', route: '#/', setup: newOwner },
  { session: 'S7', file: '02-apply-step1', route: '#/', setup: async (page) => { await newOwner(page); await applyStep1(page); await page.waitForTimeout(600) } },
  {
    session: 'S7', file: '03-apply-step1-errors', route: '#/',
    setup: async (page) => {
      await newOwner(page)
      await page.getByRole('button', { name: 'List my charger' }).click()
      await page.getByLabel('Title').fill('Bay')
      await applyNext(page)
      await page.locator('.field-error').first().waitFor()
    },
  },
  { session: 'S7', file: '04-apply-step2', route: '#/', setup: async (page) => { await newOwner(page); await applyStep2(page) } },
  {
    session: 'S7', file: '05-apply-step3-photos', route: '#/',
    setup: async (page) => {
      await newOwner(page)
      await applyStep3(page)
      await page.locator('.apply .scroll').evaluate((el) => el.scrollTo(0, 0))
    },
  },
  { session: 'S7', file: '06-application-received', route: '#/', setup: async (page) => { await newOwner(page); await submitApp(page) } },
  {
    session: 'S7', file: '07-demo-sheet-platform-actions', route: '#/',
    setup: async (page) => {
      await newOwner(page)
      await submitApp(page)
      await page.getByRole('button', { name: 'Back to home' }).click()
      await openDemoSheet(page)
      await page.getByText('Platform (admin) actions').evaluate((el) => el.scrollIntoView({ block: 'start' }))
    },
  },
  {
    session: 'S7', file: '08-changes-requested-card', route: '#/',
    setup: async (page) => {
      await newOwner(page)
      const id = await submitApp(page)
      await page.getByRole('button', { name: 'Back to home' }).click()
      await platform(page, id, 'Request changes')
      await page.getByText('Please add a clearer photo of the charger').waitFor()
      await page.locator('.notify-toast').waitFor({ state: 'detached', timeout: 7000 })
    },
  },
  {
    session: 'S7', file: '09-finish-setup', route: '#/',
    setup: async (page) => {
      await newOwner(page)
      await approvedNewSpot(page)
      await page.getByRole('button', { name: 'Finish setup' }).click()
      await page.getByLabel('Gate PIN (4 digits)').fill('2468')
      await page.getByLabel('Access instructions').fill('Blue roller door, bay on the left.')
    },
  },
  {
    session: 'S7', file: '10-go-live-toast-my-spots', route: '#/',
    setup: async (page) => {
      await newOwner(page)
      await approvedNewSpot(page)
      await page.getByRole('button', { name: 'Finish setup' }).click()
      await page.getByLabel('Gate PIN (4 digits)').fill('2468')
      await page.getByLabel('Access instructions').fill('Blue roller door, bay on the left.')
      await page.getByRole('button', { name: 'Go live' }).click()
      await page.getByText('Your charger is live').waitFor()
    },
  },
  {
    session: 'S7', file: '11-driver-map-new-pin', route: '#/app', init: asDriver,
    setup: async (page) => {
      await page.evaluate(() => {
        const db = JSON.parse(localStorage.getItem('pp.db'))
        const src = db.spots.find((s) => s.id === 'sp_saikung_1')
        db.spots.push({ ...src, id: 'sp_new_live', ownerId: 'u_owner_demo', title: 'Ho family garage — Pak Tam Chung', address: 'Pak Tam Road, Sai Kung', lat: 22.394, lng: 114.318, pricePerHour: 26, rating: 5, reviewsCount: 0, photoSeed: 12, reviewStatus: 'approved', active: true })
        localStorage.setItem('pp.db', JSON.stringify(db))
      })
      await page.reload()
      await waitForMap(page)
      await tapPin(page, 'sp_new_live')
      await page.locator('.spot-preview').waitFor()
      await page.waitForTimeout(1500)
    },
  },
  {
    session: 'S7', file: '12-no-branch-section', route: '#/app', init: asDriver,
    setup: async (page) => {
      await openDemoSheet(page)
      await page.getByText('Show a “No” branch').evaluate((el) => el.scrollIntoView({ block: 'start' }))
    },
  },
  { session: 'S7', file: '13-error-booking-not-found', route: '#/app/booking/nope', init: asDriver },
  { session: 'S7', file: '14-error-owner-spot-not-found', route: '#/owner/setup/nope', init: asOwner },
  { session: 'S7', file: '15-empty-past-bookings', route: '#/app/bookings', init: asDriver, setup: async (page) => page.getByRole('tab', { name: 'Upcoming' }).click() },
)

async function fillRegistration(page, email) {
  await page.getByLabel('Full name').fill('Ho Ka Yan')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Mobile number').fill('98765432')
  await page.getByLabel('Password', { exact: true }).fill('Charge2026')
  await page.getByLabel('Confirm password').fill('Charge2026')
  await page.getByText('I agree to the Terms').click()
}

async function registerNewDriver(page) {
  await fillRegistration(page, 'ho.kayan@example.com')
  await page.getByRole('button', { name: 'Continue' }).click({ force: true })
  await page.waitForURL(/#\/verify$/)
  await page.getByLabel('Digit 1 of 6').waitFor()
}

async function loginAsDemo(page) {
  await page.getByRole('button', { name: 'Demo driver' }).click()
  await page.getByRole('button', { name: 'Log in', exact: true }).click()
  await page.waitForURL(/#\/verify$/)
  await page.getByLabel('Digit 1 of 6').waitFor()
}


const IGNORED = /fonts\.googleapis|fonts\.gstatic|basemaps\.cartocdn|tile\.openstreetmap|favicon/i

async function main() {
  const arg = process.argv[2]
  if (!arg) throw new Error('Usage: npm run shots -- S<n>   (or: all)')
  const sessions = arg === 'all' ? [...new Set(scenarios.map((s) => s.session))] : [arg.toUpperCase()]
  const todo = scenarios.filter((s) => sessions.includes(s.session))
  if (todo.length === 0) throw new Error(`No scenarios for ${arg}`)

  build()
  const cleanup = await startPreview()

  const problems = []
  let count = 0
  let browser
  try {
    browser = await chromium.launch()

    for (const session of sessions) {
      const dir = path.join(OUT_ROOT, session)
      fs.mkdirSync(dir, { recursive: true })
      for (const f of fs.readdirSync(dir)) if (f.endsWith('.png')) fs.rmSync(path.join(dir, f))
    }

    for (const sc of todo) {
      const context = await browser.newContext({ ...(sc.device ?? PHONE), reducedMotion: 'reduce' })
      if (sc.init) await sc.init(context)
      const page = await context.newPage()
      const tag = `${sc.session}/${sc.file}`
      page.on('pageerror', (err) => problems.push(`${tag}: page error: ${err.message}`))
      page.on('console', (msg) => {
        if (msg.type() !== 'error') return
        const where = msg.location()?.url ?? ''
        if (IGNORED.test(msg.text()) || IGNORED.test(where)) return
        problems.push(`${tag}: console error: ${msg.text()}`)
      })
      page.on('requestfailed', (req) => {
        if (!IGNORED.test(req.url())) problems.push(`${tag}: request failed: ${req.url()}`)
      })

      await page.goto(BASE + sc.route, { waitUntil: 'networkidle' })
      await page.evaluate(() => document.fonts.ready)
      if (sc.setup) await sc.setup(page)
      await page.waitForTimeout(sc.settle ?? 300)
      const out = path.join(OUT_ROOT, sc.session, `${sc.file}.png`)
      await page.screenshot({ path: out })
      console.log(`  ✓ ${path.relative(ROOT, out)}`)
      count++
      await context.close()
    }
  } finally {
    await browser?.close()
    cleanup()
  }

  if (problems.length) {
    console.error(`\n✗ ${problems.length} problem(s):\n  ` + problems.join('\n  '))
    process.exit(1)
  }
  console.log(`\n${count} screenshot(s), no errors.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
