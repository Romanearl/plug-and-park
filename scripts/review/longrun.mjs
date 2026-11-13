// Code review: long-session run. Leaves the driver on the charging screen and the owner on Requests / Earnings
// (inside the presenter view, like the real demo) and samples memory, DOM nodes and listeners once a minute.
//   node scripts/review/longrun.mjs --min 15
// Needs a running preview (PP_BASE, default http://localhost:4173/plug-and-park/).

import { chromium } from 'playwright'

const args = process.argv.slice(2)
const MIN = +(args[args.indexOf('--min') + 1] ?? 15) || 15
const BASE = process.env.PP_BASE ?? 'http://localhost:4173/plug-and-park/'
const IGNORE = /tile\.openstreetmap|fonts\.g|ERR_FAILED|net::ERR/
const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } })
const P = await ctx.newPage()
const errors = []
P.on('pageerror', (e) => errors.push(e.message))
P.on('console', (m) => (m.type() === 'error' || m.type() === 'warning') && !IGNORE.test(m.text()) && errors.push(`${m.type()}: ${m.text()}`))
const cdp = await ctx.newCDPSession(P)
await cdp.send('Performance.enable')
const sample = async () => {
  await cdp.send('HeapProfiler.collectGarbage')
  const m = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((x) => [x.name, x.value]))
  return { heapMB: +(m.JSHeapUsedSize / 1e6).toFixed(1), nodes: m.Nodes, listeners: m.JSEventListeners, frames: m.Frames }
}

await P.goto(BASE + '#/presenter')
const d = P.frameLocator('iframe[name="driver"]')
const o = P.frameLocator('iframe[name="owner"]')
await d.locator('.pin').first().waitFor({ timeout: 15000 })
await P.getByRole('button', { name: 'Reset demo' }).click()
await d.locator('.pin').first().waitFor({ timeout: 15000 })
const df = P.frame({ name: 'driver' })
await df.evaluate(() => (location.hash = '#/app/spot/sp_kwuntong_1'))
await d.getByRole('button', { name: 'Request booking', exact: true }).click()
const sheet = d.getByRole('dialog', { name: 'Request booking' })
await sheet.getByRole('button', { name: 'Tomorrow', exact: true }).click()
await sheet.getByRole('button', { name: '13:00', exact: true }).click()
await sheet.getByRole('button', { name: /^Request booking ·/ }).click()
await d.locator('.status-card[data-status="pending"]').waitFor()
await o.locator('.request-card').first().getByRole('button', { name: 'Approve' }).click()
await d.getByRole('button', { name: /^Pay HK\$/ }).click()
await d.getByRole('button', { name: 'Use test card' }).click()
await d.getByRole('button', { name: /^Pay HK\$/ }).click()
await d.locator('svg.qr').waitFor()
await d.getByRole('button', { name: /start charging/ }).click()
await d.locator('.ring-wrap').waitFor()
await d.getByText('Session complete').waitFor({ timeout: 35000 })
const of = P.frame({ name: 'owner' })
await of.evaluate(() => (location.hash = '#/owner/earnings'))
await o.getByRole('button', { name: 'Withdraw', exact: true }).click()
await o.getByRole('button', { name: /^Withdraw HK\$/ }).click()
await o.getByRole('button', { name: 'Done' }).click()

const samples = [await sample()]
console.log(`start  ${JSON.stringify(samples[0])}`)
for (let i = 1; i <= MIN; i++) {
  await P.waitForTimeout(60_000)
  samples.push(await sample())
  console.log(`min ${String(i).padStart(2)} ${JSON.stringify(samples[i])}`)
}
const first = samples[1] ?? samples[0] // after the first minute, everything has settled
const last = samples[samples.length - 1]
const stillFine = (await d.getByText('Session complete').isVisible()) && (await o.getByText('Paid', { exact: true }).first().isVisible())
const grow = { heapMB: +(last.heapMB - first.heapMB).toFixed(1), nodes: last.nodes - first.nodes, listeners: last.listeners - first.listeners }
const ok = stillFine && errors.length === 0 && grow.heapMB < 5 && grow.nodes < 300 && grow.listeners < 50
console.log(`\n${ok ? 'PASS' : 'FAIL'}  ${MIN}-minute session: growth after the first minute ${JSON.stringify(grow)}, screens still right: ${stillFine}, console errors: ${errors.length ? errors.slice(0, 3).join(' | ') : 'none'}`)
await browser.close()
process.exit(ok ? 0 : 1)
