// Builds the S10 demo kit into "Claude outputs1/demo-kit/":
//   qr-slide.png, docs/qr-live-demo.{svg,png}, backup-demo.webm (presenter, 1280×720, paced),
//   driver-flow.webm (single phone), screens/phone/*.png, screens/framed/*.png (transparent), screens/flow/*.png
// Usage: node scripts/demo-kit.mjs [--only qr|video|screens|flows]
import fs from 'node:fs'
import path from 'node:path'
import QRCode from 'qrcode'
import { chromium } from 'playwright'
import { BASE, ROOT, build, startPreview } from './lib/server.mjs'

const LIVE = 'https://romanearl.github.io/plug-and-park/'
const KIT = path.join(ROOT, 'Claude outputs1', 'demo-kit')
const only = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1] : null
const want = (k) => !only || only === k
const mk = (...p) => fs.mkdirSync(path.join(...p), { recursive: true })
mk(KIT, 'screens', 'phone')
mk(KIT, 'screens', 'framed')
mk(KIT, 'screens', 'flow')
mk(ROOT, 'docs')

const WORDMARK = `<div style="width:120px;height:120px;background:#7399c6;color:#fff;font:400 28px/1.02 'Libre Caslon Text',Georgia,serif;display:flex;flex-direction:column;justify-content:center;padding:0 16px;border-radius:10px"><span>Plug &amp;</span><span>Park</span></div>`
const FONTS = `<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&family=Libre+Caslon+Text&display=swap" rel="stylesheet">`

// Visible tap dot for recordings only (injected by this script, never shipped in the app).
const TAP_DOT = () => {
  addEventListener(
    'pointerdown',
    (e) => {
      const d = document.createElement('div')
      d.style.cssText = `position:fixed;left:${e.clientX - 18}px;top:${e.clientY - 18}px;width:36px;height:36px;border-radius:50%;background:rgba(115,153,198,.55);border:3px solid #fff;box-shadow:0 0 0 2px rgba(0,0,0,.35);z-index:2147483647;pointer-events:none;transition:transform .5s ease-out,opacity .5s ease-out`
      document.documentElement.appendChild(d)
      requestAnimationFrame(() => {
        d.style.transform = 'scale(1.6)'
        d.style.opacity = '0'
      })
      setTimeout(() => d.remove(), 650)
    },
    true,
  )
}
// Human pace for the recordings: every pause is stretched (target 2.5–4 min for the backup video).
let PACE = 1
const pause = (p, ms = 1300) => p.waitForTimeout(ms * PACE)
async function slowType(loc, text) {
  await loc.click()
  await loc.fill('')
  await loc.pressSequentially(text, { delay: 110 })
}

// ── QR assets ──
async function qr(browser) {
  fs.writeFileSync(path.join(ROOT, 'docs', 'qr-live-demo.svg'), await QRCode.toString(LIVE, { type: 'svg', margin: 2, errorCorrectionLevel: 'M' }))
  await QRCode.toFile(path.join(ROOT, 'docs', 'qr-live-demo.png'), LIVE, { width: 600, margin: 2 })
  const svg = await QRCode.toString(LIVE, { type: 'svg', margin: 2, color: { dark: '#000000', light: '#ffffff' } })
  const p = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
  await p.setContent(`<html><head>${FONTS}</head><body style="margin:0;width:1920px;height:1080px;background:#000;color:#fff;font-family:Inter,Arial,sans-serif;display:flex;align-items:center;justify-content:center;gap:140px">
    <div>${WORDMARK}<div style="font-size:96px;font-weight:800;letter-spacing:-.03em;margin-top:48px">Try it now</div>
    <div style="font-size:34px;color:#a9b4c2;margin-top:18px;max-width:640px">Scan with your phone camera. Demo logins are in the “Demo” strip at the top.</div>
    <div style="font-size:40px;font-weight:600;margin-top:44px;color:#7399c6">romanearl.github.io/plug-and-park</div></div>
    <div style="width:600px;height:600px;background:#fff;border-radius:28px;display:flex;align-items:center;justify-content:center">${svg.replace('<svg', '<svg width="552" height="552"')}</div></body></html>`)
  await p.evaluate(() => document.fonts.ready)
  await p.waitForTimeout(800)
  await p.screenshot({ path: path.join(KIT, 'qr-slide.png') })
  await p.close()
  console.log('✓ QR assets + qr-slide.png')
}

// ── Backup video: presenter view, 1280×720, paced for humans ──
async function backupVideo(browser) {
  const tmp = path.join(KIT, '_rec')
  fs.rmSync(tmp, { recursive: true, force: true })
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, recordVideo: { dir: tmp, size: { width: 1280, height: 720 } } })
  await ctx.addInitScript(TAP_DOT)
  const P = await ctx.newPage()
  await P.goto(BASE + '#/presenter')
  const d = P.frameLocator('iframe[name="driver"]')
  const o = P.frameLocator('iframe[name="owner"]')
  await d.locator('.pin').first().waitFor({ timeout: 15000 })
  await P.getByRole('button', { name: 'Reset demo' }).click()
  await d.locator('.pin').first().waitFor({ timeout: 15000 })
  await o.getByRole('heading', { name: 'Hi, Mei Ling' }).waitFor()
  await pause(P, 2500)
  // Search: district → Kwun Tong → the Hoi Bun Road pin
  await d.getByRole('button', { name: /Where do you need to charge/ }).click()
  await pause(P, 1500)
  await d.getByRole('dialog', { name: 'Choose a district' }).getByRole('button', { name: /Kwun Tong/ }).click()
  await pause(P, 2200)
  await d.locator('.pin[data-spot="sp_kwuntong_1"]').click()
  await pause(P, 2200)
  await d.getByRole('button', { name: 'View details' }).click()
  await pause(P, 1800)
  await d.locator('.scroll').first().evaluate((el) => el.scrollTo({ top: 500, behavior: 'smooth' }))
  await pause(P, 1800)
  await d.locator('.scroll').first().evaluate((el) => el.scrollTo({ top: 0, behavior: 'smooth' }))
  await pause(P, 1000)
  // Booking: 10:00 is taken (No branch) → the suggested 12:00
  await d.getByRole('button', { name: 'Request booking', exact: true }).click()
  await pause(P)
  const sheet = d.getByRole('dialog', { name: 'Request booking' })
  await sheet.getByRole('button', { name: 'Tomorrow', exact: true }).click()
  await pause(P, 900)
  await sheet.getByRole('button', { name: '10:00', exact: true }).click()
  await pause(P, 900)
  await sheet.getByRole('button', { name: /^Request booking ·/ }).click()
  await sheet.getByText('This slot is no longer available').waitFor()
  await pause(P, 2800)
  await sheet.locator('.notice').getByRole('button', { name: '12:00', exact: true }).click()
  await pause(P, 1000)
  await sheet.getByRole('button', { name: /^Request booking ·/ }).click()
  await d.locator('.status-card[data-status="pending"]').waitFor()
  await pause(P, 2500)
  // Owner approves → driver flips live
  await o.locator('.request-card').first().waitFor()
  await pause(P, 1500)
  await o.locator('.request-card').first().getByRole('button', { name: 'Approve' }).click()
  await d.locator('.status-card[data-status="confirmed"]').waitFor()
  await pause(P, 2800)
  // Pay: declined card (No branch) → 4242
  await d.getByRole('button', { name: /^Pay HK\$/ }).click()
  await pause(P)
  await d.getByRole('button', { name: 'Use declined card' }).click()
  await pause(P, 1200)
  await d.getByRole('button', { name: /^Pay HK\$/ }).click()
  await d.getByText('Your card was declined. Try another card.').waitFor()
  await pause(P, 2800)
  await d.getByRole('button', { name: 'Use test card' }).click()
  await pause(P, 1200)
  await d.getByRole('button', { name: /^Pay HK\$/ }).click()
  await d.locator('svg.qr').waitFor()
  await pause(P, 3200)
  // Charge
  await d.getByRole('button', { name: /start charging/ }).click()
  await d.locator('.ring-wrap').waitFor()
  await d.getByText('Session complete').waitFor({ timeout: 40000 })
  await pause(P, 2200)
  await d.getByRole('button', { name: 'Rate your experience' }).click()
  await pause(P, 1000)
  await d.getByRole('radio', { name: '5 stars' }).click()
  await pause(P, 700)
  await d.getByRole('button', { name: 'Fast charging' }).click()
  await pause(P, 600)
  await d.getByRole('button', { name: 'Submit review' }).click()
  await pause(P, 2200)
  // Owner: earnings breakdown + withdraw
  await o.getByRole('button', { name: 'Earnings' }).click()
  await pause(P, 2200)
  const tx = o.locator('.tx-row').first()
  await tx.scrollIntoViewIfNeeded()
  await tx.locator('.tx-main').click()
  await pause(P, 3200)
  // Owner: Spots → Hoi Bun Road → Availability (the scheduler; nothing is changed)
  await o.getByRole('button', { name: 'Spots' }).click()
  await pause(P, 1500)
  await o.locator('.owner-spot[data-spot="sp_kwuntong_1"] .owner-spot-main').click()
  await pause(P, 1200)
  await o.getByRole('heading', { name: 'Availability' }).evaluate((el) => el.scrollIntoView({ block: 'start', behavior: 'smooth' }))
  await pause(P, 3000)
  await o.getByRole('button', { name: 'Back' }).first().click() // the spot page has no tab bar
  await pause(P, 900)
  await o.getByRole('button', { name: 'Earnings' }).click()
  await pause(P, 1500)
  await o.getByRole('button', { name: 'Withdraw', exact: true }).click()
  await pause(P, 1500)
  await o.getByRole('button', { name: /^Withdraw HK\$/ }).click()
  await o.getByText(/On its way/).waitFor()
  await pause(P, 3000)
  const v = await P.video().path()
  await ctx.close()
  fs.renameSync(v, path.join(KIT, 'backup-demo.webm'))
  fs.rmSync(tmp, { recursive: true, force: true })
  console.log('✓ backup-demo.webm')
}

// ── Single-phone driver path: video + phone screenshots (and a framed, transparent variant) ──
async function phonePath(browser, mode) {
  const framed = mode === 'framed'
  const tmp = path.join(KIT, '_rec2')
  const ctx = await browser.newContext(
    framed
      ? { viewport: { width: 1000, height: 1000 }, deviceScaleFactor: 2 }
      : { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, ...(mode === 'video' ? { recordVideo: { dir: tmp, size: { width: 390, height: 844 } } } : {}) },
  )
  if (mode === 'video') await ctx.addInitScript(TAP_DOT)
  if (framed)
    await ctx.addInitScript(() => {
      const s = document.createElement('style')
      s.textContent = 'html,body,.stage{background:transparent!important}.stage-caption{display:none!important}'
      document.addEventListener('DOMContentLoaded', () => document.head.appendChild(s))
    })
  const out = path.join(KIT, 'screens', framed ? 'framed' : 'phone')
  const shot = async (p, name) => {
    if (mode === 'video') return pause(p, 1200)
    await p.waitForTimeout(450)
    if (framed) await p.locator('.device').screenshot({ path: path.join(out, `${name}.png`), omitBackground: true })
    else await p.screenshot({ path: path.join(out, `${name}.png`) })
  }
  const D = await ctx.newPage()
  await D.goto(BASE + '#/')
  await D.evaluate(() => localStorage.removeItem('pp.db'))
  await D.reload()
  await D.getByText('Charge where').waitFor()
  await D.evaluate(() => document.fonts.ready)
  await shot(D, '01-landing')
  await D.getByRole('button', { name: /Get started/ }).click()
  await D.getByRole('radio', { name: /I drive an EV/ }).click()
  await D.getByLabel('Full name').fill('Chan Tai Man')
  await D.getByLabel('Email').fill('chan@mail')
  await D.getByLabel('Mobile number').fill('9123')
  await D.getByRole('button', { name: 'Continue' }).click({ force: true })
  await shot(D, '02-register-validation')
  await D.goto(BASE + '#/login')
  await D.getByRole('button', { name: 'Demo driver' }).click()
  await D.getByRole('button', { name: 'Log in', exact: true }).click()
  await D.getByLabel('Digit 1 of 6').waitFor()
  await shot(D, '03-verify-code')
  await D.keyboard.type('123456', { delay: mode === 'video' ? 150 : 0 })
  await D.locator('.pin').first().waitFor({ timeout: 15000 })
  await D.waitForFunction(() => document.querySelectorAll('.leaflet-tile-loaded').length > 6, null, { timeout: 15000 }).catch(() => {})
  await shot(D, '04-map')
  await D.getByRole('button', { name: /Where do you need to charge/ }).click()
  if (mode === 'video') await pause(D, 900)
  await D.getByRole('dialog', { name: 'Choose a district' }).getByRole('button', { name: /Kwun Tong/ }).click()
  await D.waitForTimeout(1300)
  await D.locator('.pin[data-spot="sp_kwuntong_1"]').click()
  await D.waitForTimeout(1300)
  await D.waitForFunction(() => [...document.querySelectorAll('.leaflet-tile')].every((t) => t.complete), null, { timeout: 8000 }).catch(() => {})
  await shot(D, '05-map-district-preview')
  await D.getByRole('button', { name: 'View details' }).click()
  await D.locator('.carousel').waitFor()
  await shot(D, '06-spot-details')
  await D.getByRole('button', { name: 'Request booking', exact: true }).click()
  const s = D.getByRole('dialog', { name: 'Request booking' })
  await s.getByRole('button', { name: 'Tomorrow', exact: true }).click()
  await s.getByRole('button', { name: '13:00', exact: true }).click()
  await shot(D, '07-booking-sheet')
  await s.getByRole('button', { name: '10:00', exact: true }).click()
  await s.getByRole('button', { name: /^Request booking ·/ }).click()
  await s.getByText('This slot is no longer available').waitFor()
  await s.locator('.notice').scrollIntoViewIfNeeded()
  await shot(D, '08-slot-unavailable')
  await s.locator('.notice').getByRole('button', { name: '12:00', exact: true }).click()
  await s.getByRole('button', { name: /^Request booking ·/ }).click()
  await D.locator('.status-card[data-status="pending"]').waitFor()
  await shot(D, '09-request-pending')
  const id = D.url().split('/').pop()
  // Owner in a second tab of the same browser
  const O = await ctx.newPage()
  await O.goto(BASE + '#/')
  await O.evaluate(() => sessionStorage.setItem('pp.session.main', 'u_owner_demo'))
  await O.goto(BASE + `?r=${Date.now()}#/owner`)
  await O.locator(`.request-card[data-booking="${id}"]`).waitFor()
  await O.waitForTimeout(5000) // let the "New booking request" toast clear
  if (mode !== 'video') await shot(O, '10-owner-request')
  await O.locator(`.request-card[data-booking="${id}"]`).getByRole('button', { name: 'Approve' }).click()
  await D.bringToFront()
  await D.locator('.status-card[data-status="confirmed"]').waitFor()
  await D.locator('.notify-toast').waitFor({ state: 'detached', timeout: 7000 }).catch(() => {})
  await shot(D, '11-booking-approved')
  await D.getByRole('button', { name: /^Pay HK\$/ }).click()
  await D.getByRole('button', { name: 'Use declined card' }).click()
  await D.getByRole('button', { name: /^Pay HK\$/ }).click()
  await D.getByText('Your card was declined. Try another card.').waitFor()
  await D.locator('.scroll').first().evaluate((el) => el.scrollTo(0, 0))
  await shot(D, '12-payment-declined')
  await D.getByRole('button', { name: 'Use test card' }).click()
  await D.getByRole('button', { name: /^Pay HK\$/ }).click()
  await D.locator('svg.qr').waitFor()
  await D.locator('.access-card').scrollIntoViewIfNeeded()
  await shot(D, '13-access-qr-pin')
  await D.getByRole('button', { name: /start charging/ }).click()
  await D.locator('.ring-wrap').waitFor()
  await D.waitForTimeout(11000)
  await shot(D, '14-charging')
  await D.getByText('Session complete').waitFor({ timeout: 30000 })
  await shot(D, '15-session-complete')
  await D.getByRole('button', { name: 'Rate your experience' }).click()
  await D.getByRole('radio', { name: '5 stars' }).click()
  await D.getByRole('button', { name: 'Fast charging' }).click()
  await D.getByRole('button', { name: 'Easy to find' }).click()
  await D.getByLabel('Tell other drivers more (optional)').fill('Guard showed me the bay — full in under an hour.')
  await shot(D, '16-rate')
  await D.getByRole('button', { name: 'Submit review' }).click()
  await D.getByText('Thanks for your review!').waitFor()
  let videoPath = null
  if (mode === 'video') {
    await pause(D, 2000)
    videoPath = await D.video().path()
    await ctx.close()
    fs.renameSync(videoPath, path.join(KIT, 'driver-flow.webm'))
    fs.rmSync(tmp, { recursive: true, force: true })
    console.log('✓ driver-flow.webm')
    return
  }
  // Owner screens
  await O.bringToFront()
  await O.goto(BASE + `?r=${Date.now()}#/owner/earnings`)
  await O.locator('.tx-row').first().locator('.tx-main').click()
  await O.locator('.tx-row').first().evaluate((el) => el.scrollIntoView({ block: 'center' }))
  await shot(O, '17-owner-earnings-breakdown')
  await O.locator('.scroll').first().evaluate((el) => el.scrollTo(0, 0))
  await O.getByRole('button', { name: 'Withdraw', exact: true }).click()
  await O.getByRole('button', { name: /^Withdraw HK\$/ }).click()
  await O.getByText(/On its way/).waitFor()
  await shot(O, '18-withdraw-success')
  await O.goto(BASE + `?r=${Date.now()}#/owner/spots/sp_kwuntong_1`)
  await O.getByRole('heading', { name: 'Availability' }).evaluate((el) => el.scrollIntoView({ block: 'start' }))
  await shot(O, '19-owner-scheduler')
  // Onboarding (diagram 3): a brand-new owner
  await O.evaluate(() => {
    const db = JSON.parse(localStorage.getItem('pp.db'))
    db.users.push({ id: 'u_owner_new', role: 'owner', name: 'Ho Wing Sze', email: 'ho.wingsze@example.com', phone: '+852 9876 5432', passwordHash: 'x', verified: true, rating: 5, ratingCount: 0, createdAt: new Date().toISOString() })
    localStorage.setItem('pp.db', JSON.stringify(db))
    sessionStorage.setItem('pp.session.main', 'u_owner_new')
  })
  await O.goto(BASE + `?r=${Date.now()}#/owner`)
  await O.getByText('List your charger and earn').waitFor()
  await shot(O, '20-onboarding-welcome')
  await O.getByRole('button', { name: 'List my charger' }).click()
  await O.getByLabel('Title').fill('Ho family garage — Pak Tam Chung')
  await O.getByLabel('Address').fill('Pak Tam Road, Sai Kung')
  await O.getByLabel('District').selectOption('Sai Kung')
  await O.getByRole('radio', { name: 'Village house' }).click()
  await O.locator('.mini-map .leaflet-tile-loaded').first().waitFor({ timeout: 8000 }).catch(() => {})
  await shot(O, '21-onboarding-step1')
  await O.getByRole('button', { name: 'Next' }).click()
  await O.getByRole('radio', { name: 'Type 2' }).click()
  await O.getByRole('button', { name: 'Next' }).click()
  await O.getByRole('button', { name: 'Use sample photo' }).click()
  await O.getByRole('button', { name: 'Use sample photo' }).click()
  await O.getByText('I confirm I have the right').click()
  await O.locator('.apply .scroll').evaluate((el) => el.scrollTo(0, 0))
  await shot(O, '22-onboarding-photos-hours')
  await O.getByRole('button', { name: 'Submit application' }).click()
  await O.getByText('Application received').waitFor()
  await shot(O, '23-application-received')
  const newId = await O.evaluate(() => JSON.parse(localStorage.getItem('pp.db')).spots.find((s) => s.ownerId === 'u_owner_new').id)
  await O.getByRole('button', { name: 'Back to home' }).click()
  await O.getByRole('button', { name: /Demo only/ }).click()
  await O.locator(`[data-admin-spot="${newId}"]`).getByRole('button', { name: 'Approve' }).click()
  await O.keyboard.press('Escape') // close the demo sheet
  await O.getByRole('button', { name: 'Finish setup' }).click()
  await O.getByLabel('Gate PIN (4 digits)').fill('2468')
  await O.getByLabel('Access instructions').fill('Blue roller door, bay on the left.')
  await O.locator('.notify-toast').waitFor({ state: 'detached', timeout: 7000 }).catch(() => {})
  await shot(O, '24-finish-setup')
  await O.getByRole('button', { name: 'Go live' }).click()
  await O.getByText('Your charger is live').waitFor()
  await D.bringToFront()
  await D.goto(BASE + `?r=${Date.now()}#/app`)
  await D.locator(`.pin[data-spot="${newId}"], .pin[data-spots~="${newId}"]`).waitFor() // it's on the map (maybe inside a group pin)…
  await D.locator(`.spot-card[data-spot="${newId}"]`).click() // …but overlaps other Sai Kung pins, so select it from the list
  await D.locator('.spot-preview').waitFor()
  await D.waitForTimeout(1500)
  await shot(D, '25-live-on-driver-map')
  await ctx.close()
  console.log(`✓ screens/${framed ? 'framed' : 'phone'} (25)`)
}

// ── Flow images: framed screens side by side with arrows + captions ──
async function flows(browser) {
  const F = path.join(KIT, 'screens', 'framed')
  const img = (n) => `data:image/png;base64,${fs.readFileSync(path.join(F, `${n}.png`)).toString('base64')}`
  const sets = {
    'driver-flow': ['Diagram 1 — Driver books, pays and charges', [['04-map', 'Search the map'], ['06-spot-details', 'See spot details'], ['08-slot-unavailable', 'Slot taken? → "No" branch'], ['09-request-pending', 'Request sent to owner'], ['11-booking-approved', 'Owner approved'], ['13-access-qr-pin', 'Pay → QR + PIN'], ['14-charging', 'Live charging data'], ['16-rate', 'Rate and review']]],
    'owner-flow': ['Diagram 2 — Owner approves and gets paid', [['10-owner-request', 'Request with driver rating'], ['11-booking-approved', 'Driver notified'], ['17-owner-earnings-breakdown', '− 18% fee − 3% gateway'], ['18-withdraw-success', 'Net payout via FPS'], ['19-owner-scheduler', 'Weekly availability']]],
    'onboarding-flow': ['Diagram 3 — A new owner lists a charger', [['20-onboarding-welcome', 'Register as owner'], ['21-onboarding-step1', 'Application: the bay'], ['22-onboarding-photos-hours', 'Photos and hours'], ['23-application-received', 'Platform reviews'], ['24-finish-setup', 'Access code + payout'], ['25-live-on-driver-map', 'Live on the map']]],
  }
  for (const [file, [title, steps]] of Object.entries(sets)) {
    const w = steps.length * 300 + 120
    const p = await browser.newPage({ viewport: { width: w, height: 760 }, deviceScaleFactor: 2 })
    await p.setContent(`<html><head>${FONTS}</head><body style="margin:0;background:#fff;font-family:Inter,Arial,sans-serif;padding:36px 60px">
      <div style="font-size:30px;font-weight:800;letter-spacing:-.02em">${title}</div>
      <div style="display:flex;align-items:flex-start;margin-top:26px">${steps
        .map(([n, cap], i) => `<div style="width:236px;text-align:center"><img src="${img(n)}" style="width:236px;display:block"><div style="font-size:16px;font-weight:600;margin-top:12px"><span style="display:inline-block;width:26px;height:26px;border-radius:50%;background:#7399c6;color:#000;font-size:14px;line-height:26px;margin-right:6px">${i + 1}</span>${cap}</div></div>${i < steps.length - 1 ? '<div style="width:64px;height:494px;display:flex;align-items:center;justify-content:center;font-size:40px;color:#3e5f8a">→</div>' : ''}`)
        .join('')}</div></body></html>`)
    await p.evaluate(() => document.fonts.ready)
    await p.waitForTimeout(500)
    await p.screenshot({ path: path.join(KIT, 'screens', 'flow', `${file}.png`), fullPage: true })
    await p.close()
  }
  console.log('✓ screens/flow (3)')
}

build()
const stop = await startPreview()
const browser = await chromium.launch()
try {
  if (want('qr')) await qr(browser)
  if (want('video')) {
    PACE = 2.2
    await backupVideo(browser)
    PACE = 1.4
    await phonePath(browser, 'video')
    PACE = 1
  }
  if (want('screens')) {
    await phonePath(browser, 'phone')
    await phonePath(browser, 'framed')
  }
  if (want('flows') || want('screens')) await flows(browser)
} finally {
  await browser.close()
  stop()
}
