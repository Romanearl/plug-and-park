// BOOKING_APPROVE_TASK screenshots → "Claude outputs1/screenshots/APPROVE/"
//   node scripts/approve-shots.mjs      (builds, starts the preview, shoots at 390×844 @2x)
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'
import { BASE, ROOT, build, startPreview } from './lib/server.mjs'

const out = path.join(ROOT, 'Claude outputs1', 'screenshots', 'APPROVE')
fs.mkdirSync(out, { recursive: true })
const IGNORE = /tile\.openstreetmap|basemaps\.cartocdn|fonts\.g|ERR_FAILED|net::/
const errors = []

build()
const stop = await startPreview()
const browser = await chromium.launch()
const ctxOpts = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
async function tab(ctx, user) {
  const p = await ctx.newPage()
  p.on('pageerror', (e) => errors.push(e.message))
  p.on('console', (m) => m.type() === 'error' && !IGNORE.test(m.text()) && errors.push(m.text()))
  await p.addInitScript((uid) => {
    try {
      sessionStorage.getItem('pp.session.main') || sessionStorage.setItem('pp.session.main', uid)
    } catch {}
  }, user)
  return p
}
const shot = (p, name) => p.screenshot({ path: path.join(out, name) })
async function book(p, spotId, time) {
  await p.goto(BASE + '#/app/spot/' + spotId)
  await p.getByRole('button', { name: 'Request booking' }).click()
  const sheet = p.getByRole('dialog', { name: 'Request booking' })
  await sheet.getByRole('button', { name: 'Tomorrow', exact: true }).click()
  await sheet.getByRole('button', { name: time, exact: true }).click()
  await sheet.getByRole('button', { name: '1 h', exact: true }).click()
  await sheet.getByRole('button', { name: /^Request booking ·/ }).click()
  await p.waitForURL(/#\/app\/booking\/bk_/, { timeout: 5000 })
}

try {
  // 01 + 02: demo sheet with two pending requests (two owners), then its empty state.
  {
    const ctx = await browser.newContext(ctxOpts)
    const p = await tab(ctx, 'u_owner_demo')
    await p.goto(BASE + '#/owner')
    await p.locator('.request-card').first().waitFor()
    // A pending request for Lee Ka Fai. Its createdAt is pushed 2 minutes ahead only so that
    // auto-approve doesn't take it away before the shot.
    await p.evaluate(() => {
      const db = JSON.parse(localStorage.getItem('pp.db'))
      const d = new Date(Date.now() + 86400e3)
      d.setHours(13, 0, 0, 0)
      const now = new Date(Date.now() + 120e3).toISOString()
      db.bookings.push({ id: 'bk_shot_1', spotId: 'sp_yuenlong_1', driverId: 'u_driver_demo', ownerId: 'u_owner_2', start: d.toISOString(), durationMinutes: 60, price: 20, commissionRate: 0.18, status: 'pending', createdAt: now, updatedAt: now })
      localStorage.setItem('pp.db', JSON.stringify(db))
    })
    await p.reload()
    await p.locator('.demo-banner').click()
    const sheet = p.getByRole('dialog', { name: 'Demo controls' })
    // Show the whole section: both rows, centred in the sheet.
    await sheet.locator('.admin-list').last().evaluate((el) => el.scrollIntoView({ block: 'center' }))
    await p.waitForTimeout(500)
    await shot(p, '01-demo-sheet-pending-requests.png')
    for (const id of ['bk_shot_1', 'bk_pending_1']) await sheet.locator(`[data-admin-booking="${id}"]`).getByRole('button', { name: 'Approve' }).click()
    await sheet.getByText('No pending requests.').scrollIntoViewIfNeeded()
    await p.waitForTimeout(500)
    await shot(p, '02-demo-sheet-empty-state.png')
    await ctx.close()
  }
  // 03 + 04: a driver's request to another owner (Kam Tin, Lee Ka Fai): waiting, then auto-approved.
  {
    const ctx = await browser.newContext(ctxOpts)
    const d = await tab(ctx, 'u_driver_demo')
    await book(d, 'sp_yuenlong_1', '13:00')
    await d.locator('.status-card[data-status="pending"]').waitFor()
    await d.waitForTimeout(400)
    await shot(d, '03-other-owner-request-waiting.png')
    await d.locator('.status-card[data-status="confirmed"]').waitFor({ timeout: 8000 })
    await d.getByText('Booking approved — pay to confirm').waitFor()
    await d.waitForTimeout(500)
    await shot(d, '04-other-owner-request-auto-approved.png')
    await ctx.close()
  }
} finally {
  await browser.close()
  stop()
}
if (errors.length) {
  console.error('Console/page errors:\n' + errors.join('\n'))
  process.exit(1)
}
console.log(`4 screenshots → ${out}`)
