// BOOKING_APPROVE_TASK checks: auto-approve for the other owners + "Pending requests" in the demo sheet.
// Run via `npm run check` (or with `npm run preview` running: node scripts/checks/approve.mjs)
import { chromium } from 'playwright'
import { createServer } from 'vite'

const BASE = process.env.PP_BASE ?? 'http://localhost:4173/plug-and-park/'
const results = []
const check = (name, ok, extra = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? ' - ' + extra : ''}`)
const seen = (loc, timeout = 4000) => loc.waitFor({ timeout }).then(() => true, () => false)
const IGNORE = /tile\.openstreetmap|basemaps\.cartocdn|fonts\.g|ERR_FAILED|net::/
const KAM_TIN = 'sp_yuenlong_1' // Lee Ka Fai (u_owner_2) → auto-approved
const KWUN_TONG = 'sp_kwuntong_1' // Wong Mei Ling (demo owner) → manual

// ── 1. Pure rule: dueAutoApprovals(bookings, now) ──
{
  const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' })
  try {
    const { dueAutoApprovals } = await vite.ssrLoadModule('/src/lib/autoApprove.ts')
    const { AUTO_APPROVE_MS } = await vite.ssrLoadModule('/src/data/seed.ts')
    const t0 = Date.parse('2026-11-20T10:00:00Z')
    const bk = (id, ownerId, status = 'pending') => ({ id, ownerId, status, createdAt: new Date(t0).toISOString() })
    const other = bk('a', 'u_owner_2')
    const wong = bk('w', 'u_owner_demo')
    check('AUTO_APPROVE_MS is 5000', AUTO_APPROVE_MS === 5000)
    check('Other owner, 4.999 s after createdAt → not due', dueAutoApprovals([other], t0 + 4999).length === 0)
    check('Other owner, at 5 s → due', dueAutoApprovals([other], t0 + 5000).map((b) => b.id).join() === 'a')
    check('Other owner, long after (e.g. after a reload) → due', dueAutoApprovals([other], t0 + 3600e3).length === 1)
    check('Wong Mei Ling → never due (5 s, 1 day)', dueAutoApprovals([wong], t0 + 5000).length === 0 && dueAutoApprovals([wong], t0 + 86400e3).length === 0)
    const nonPending = ['confirmed', 'declined', 'cancelled', 'paid', 'active', 'completed'].map((s) => bk('x' + s, 'u_owner_3', s))
    check('Non-pending bookings → never due', dueAutoApprovals(nonPending, t0 + 86400e3).length === 0)
    check('Mixed list → only the due other-owner request', dueAutoApprovals([other, wong, ...nonPending], t0 + 6000).map((b) => b.id).join() === 'a')
  } finally {
    await vite.close()
  }
}

// ── Browser helpers ──
const browser = await chromium.launch()
const errors = []
const watch = (p) => {
  p.on('pageerror', (e) => errors.push(e.message))
  p.on('console', (m) => m.type() === 'error' && !IGNORE.test(m.text()) && errors.push(m.text()))
}
async function tab(ctx, user) {
  const p = await ctx.newPage()
  watch(p)
  if (user)
    await p.addInitScript((uid) => {
      try {
        sessionStorage.getItem('pp.session.main') || sessionStorage.setItem('pp.session.main', uid)
      } catch {}
    }, user)
  return p
}
const newCtx = () => browser.newContext({ viewport: { width: 390, height: 844 } })
const statusOf = (p, id) => p.evaluate((bid) => JSON.parse(localStorage.getItem('pp.db')).bookings.find((b) => b.id === bid)?.status, id)

/** Driver (page or frame): open the spot, request tomorrow at `time` for 1 h. Returns the booking id and when it was made. */
async function book(root, spotId, time) {
  await root.goto(BASE + '#/app/spot/' + spotId)
  await root.getByRole('button', { name: 'Request booking' }).click()
  const sheet = root.getByRole('dialog', { name: 'Request booking' })
  await sheet.getByRole('button', { name: 'Tomorrow', exact: true }).click()
  await sheet.getByRole('button', { name: time, exact: true }).click()
  await sheet.getByRole('button', { name: '1 h', exact: true }).click()
  await sheet.getByRole('button', { name: /^Request booking ·/ }).click()
  await root.waitForURL(/#\/app\/booking\/bk_/, { timeout: 5000 })
  const id = root.url().split('/').pop()
  // The 5 s count from the booking's createdAt (set after the ~1 s "Checking availability…" step).
  const t = await root.evaluate((bid) => Date.parse(JSON.parse(localStorage.getItem('pp.db')).bookings.find((b) => b.id === bid).createdAt), id)
  return { id, t }
}

// ── 2. Another owner's spot (Kam Tin) → "Approved!" + toast within about 6 s ──
{
  const ctx = await newCtx()
  const d = await tab(ctx, 'u_driver_demo')
  const { id, t } = await book(d, KAM_TIN, '13:00')
  check('Kam Tin request starts pending ("Waiting for Lee Ka Fai")', (await seen(d.locator('.status-card[data-status="pending"]'), 1500)) && (await seen(d.getByText('Waiting for Lee Ka Fai to approve'), 1500)))
  await d.waitForTimeout(3000)
  check('…still pending after 3 s', (await statusOf(d, id)) === 'pending')
  const flipped = await seen(d.locator('.status-card[data-status="confirmed"]'), 6000 - (Date.now() - t))
  check('…"Approved!" within about 6 s of the request (createdAt)', flipped && Date.now() - t <= 6000, `${Date.now() - t} ms`)
  check('…with the toast "Booking approved — pay to confirm"', await seen(d.getByText('Booking approved — pay to confirm'), 1500))
  check('…and Pay HK$20 is offered', await seen(d.getByRole('button', { name: 'Pay HK$20' }), 1500))
  await ctx.close()
}

// ── 3. Wong Mei Ling's spot (Kwun Tong) → still pending after 10 s; seeded bk_pending_1 stays pending ──
{
  const ctx = await newCtx()
  const d = await tab(ctx, 'u_driver_demo')
  const { id } = await book(d, KWUN_TONG, '13:00')
  await d.waitForTimeout(10000)
  check('Kwun Tong (Wong Mei Ling) request still pending after 10 s', (await statusOf(d, id)) === 'pending' && (await seen(d.getByText('Waiting for Wong Mei Ling to approve'), 1000)))
  check('Seeded bk_pending_1 (Sai Kung, Wong Mei Ling) still pending', (await statusOf(d, 'bk_pending_1')) === 'pending')
  await ctx.close()
}

// ── 4. Reload during the 5 s; close the tab and come back after 10 s ──
{
  const ctx = await newCtx()
  const d = await tab(ctx, 'u_driver_demo')
  const { id, t } = await book(d, KAM_TIN, '13:00')
  await d.waitForTimeout(2500)
  await d.reload()
  const ok = await seen(d.locator('.status-card[data-status="confirmed"]'), 6000 - (Date.now() - t))
  check('Reload at 2.5 s → still approved on time (≤ 6 s from createdAt)', ok && Date.now() - t <= 6000, `${Date.now() - t} ms`)

  const r = await book(d, KAM_TIN, '15:00')
  await d.close() // no window of this app is open now
  await new Promise((res) => setTimeout(res, 10000))
  const d2 = await tab(ctx, 'u_driver_demo')
  await d2.goto(BASE + '#/app/booking/' + r.id)
  const t1 = Date.now()
  check('Closed tab, back after 10 s → approved at once (< 1.5 s)', await seen(d2.locator('.status-card[data-status="confirmed"]'), 1500), `${Date.now() - t1} ms`)
  await ctx.close()
}

// ── 5. Cancel within the 5 s → stays cancelled ──
{
  const ctx = await newCtx()
  const d = await tab(ctx, 'u_driver_demo')
  const { id } = await book(d, KAM_TIN, '13:00')
  await d.getByRole('button', { name: 'Cancel request' }).click()
  await d.getByRole('button', { name: 'Tap again to cancel request' }).click()
  check('Cancel within 5 s → "You cancelled this request"', await seen(d.getByText('You cancelled this request'), 2000))
  await d.waitForTimeout(7000)
  check('…still cancelled after 7 s (not auto-approved)', (await statusOf(d, id)) === 'cancelled')
  await ctx.close()
}

// ── 6. Two windows (presenter view): approved once, no errors ──
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } })
  const p = await ctx.newPage()
  watch(p)
  await p.goto(BASE + '#/presenter')
  await seen(p.frameLocator('iframe[name="owner"]').getByRole('heading', { name: 'Hi, Mei Ling' }), 8000)
  await seen(p.frameLocator('iframe[name="driver"]').locator('.pin').first(), 8000)
  const df = await (await p.$('iframe[name="driver"]')).contentFrame()
  const of = await (await p.$('iframe[name="owner"]')).contentFrame()
  // Count status changes of the booking as seen by the owner window.
  await of.evaluate(() => {
    window.__ppChanges = []
    window.addEventListener('storage', (e) => {
      if (e.key !== 'pp.db' || !e.newValue) return
      for (const b of JSON.parse(e.newValue).bookings) window.__ppChanges.push(b.id + ':' + b.status)
    })
  })
  const { id } = await book(df, KAM_TIN, '13:00')
  const ok = await seen(p.frameLocator('iframe[name="driver"]').locator('.status-card[data-status="confirmed"]'), 7000)
  await p.waitForTimeout(1500)
  check('Presenter view: Kam Tin request approved in the driver phone', ok)
  check('…both windows agree (confirmed)', (await statusOf(df, id)) === 'confirmed' && (await statusOf(of, id)) === 'confirmed')
  const toasts = await p.frameLocator('iframe[name="driver"]').getByText('Booking approved — pay to confirm').count()
  check('…one approval toast in the driver phone', toasts === 1, String(toasts))
  const flips = await of.evaluate((bid) => {
    const seq = window.__ppChanges.filter((x) => x.startsWith(bid + ':')).map((x) => x.split(':')[1])
    return seq.filter((s, i) => s === 'confirmed' && seq[i - 1] !== 'confirmed').length
  }, id)
  check('…approved once (pending → confirmed exactly once)', flips === 1, String(flips))
  check('…no console errors', errors.length === 0, errors.join(' | '))
  await ctx.close()
}

// ── 7. Slot taken when the 5 s end → declined "Slot no longer available" ──
{
  const ctx = await newCtx()
  const d = await tab(ctx, 'u_driver_demo')
  const { id } = await book(d, KAM_TIN, '13:00')
  // Another window books the same slot and it is confirmed before our 5 s are up.
  const other = await tab(ctx, null)
  await other.goto(BASE + '#/')
  await other.evaluate((src) => {
    const db = JSON.parse(localStorage.getItem('pp.db'))
    const now = new Date().toISOString()
    db.bookings.push({ ...src, id: 'bk_conflict', driverId: 'u_driver_2', status: 'confirmed', createdAt: now, updatedAt: now })
    localStorage.setItem('pp.db', JSON.stringify(db))
  }, await d.evaluate((bid) => JSON.parse(localStorage.getItem('pp.db')).bookings.find((b) => b.id === bid), id))
  await other.close()
  const declined = await seen(d.locator('.status-card[data-status="declined"]'), 7000)
  check('Slot taken meanwhile → request declined after 5 s', declined)
  check('…with "Slot no longer available"', await seen(d.getByText(/Slot no longer available/), 1500))
  check('…and the other booking keeps the slot', (await statusOf(d, 'bk_conflict')) === 'confirmed')
  await ctx.close()
}

// ── 8. Demo sheet: Pending requests (any owner), live in the other window, empty state ──
{
  const ctx = await newCtx()
  const d = await tab(ctx, 'u_driver_demo')
  const admin = await tab(ctx, 'u_owner_demo')
  await admin.goto(BASE + '#/owner')
  const { id } = await book(d, KAM_TIN, '13:00')
  await admin.locator('.demo-banner').click()
  const sheet = admin.getByRole('dialog', { name: 'Demo controls' })
  check('Demo sheet has a "Pending requests" section', await seen(sheet.getByText('Pending requests', { exact: true }), 2000))
  const row = sheet.locator(`[data-admin-booking="${id}"]`)
  const txt = (await row.textContent({ timeout: 2000 }).catch(() => '')) ?? ''
  check('Row shows driver, spot, day + time and owner', txt.includes('Chan Tai Man') && txt.includes('Kam Tin') && txt.includes('13:00') && txt.includes('Lee Ka Fai'), txt)
  const seeded = sheet.locator('[data-admin-booking="bk_pending_1"]')
  check('Lists pending requests of every owner (incl. Wong Mei Ling’s seeded one)', await seen(seeded, 1000))
  await row.getByRole('button', { name: 'Decline' }).click()
  check('Decline (another owner’s request) → the driver window shows it declined, live', (await seen(d.locator('.status-card[data-status="declined"]'), 2000)) && (await seen(d.getByText(/Other/), 1500)))
  check('…stored as declined with reason "Other"', (await d.evaluate((bid) => JSON.parse(localStorage.getItem('pp.db')).bookings.find((b) => b.id === bid)?.declineReason, id)) === 'Other')
  check('…and the row leaves the list', await row.waitFor({ state: 'detached', timeout: 2000 }).then(() => true, () => false))

  // Approve from the sheet: bk_pending_1 (Wong Mei Ling). The owner's Requests list (behind the sheet) updates.
  await seeded.getByRole('button', { name: 'Approve' }).click()
  check('Approve (Wong Mei Ling’s request) → confirmed', (await statusOf(admin, 'bk_pending_1')) === 'confirmed')
  check('…the other window has it too', (await statusOf(d, 'bk_pending_1')) === 'confirmed')
  check('Empty state "No pending requests."', await seen(sheet.getByText('No pending requests.'), 2000))

  // Live across windows: a new request shows up in the open sheet of the other window.
  const k = await book(d, KWUN_TONG, '15:00')
  check('A new request appears in the open demo sheet of the other window', await seen(sheet.locator(`[data-admin-booking="${k.id}"]`), 2000))
  await sheet.locator(`[data-admin-booking="${k.id}"]`).getByRole('button', { name: 'Approve' }).click()
  check('…Approve there flips the driver to "Approved!" live', await seen(d.locator('.status-card[data-status="confirmed"]'), 2000))
  await ctx.close()
}

await browser.close()
check('No console errors or page errors during the approve checks', errors.length === 0, errors.join(' | '))
console.log(results.join('\n'))
const failed = results.filter((r) => r.startsWith('FAIL')).length
console.log(`\n${results.length - failed}/${results.length} passed`)
process.exit(failed ? 1 : 0)
