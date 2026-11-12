// Review-fix screenshots: node scripts/rf-shots.mjs <label>
// Saves the map at the default view and at street level to "Claude outputs1/screenshots/RF/" (RF-4, RF-5 comparisons).
import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'
import { BASE, ROOT, build, startPreview } from './lib/server.mjs'

const label = process.argv[2] ?? 'after'
const out = path.join(ROOT, 'Claude outputs1', 'screenshots', 'RF')
fs.mkdirSync(out, { recursive: true })
build()
const stop = await startPreview()
const browser = await chromium.launch()
try {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
  await ctx.addInitScript(() => {
    try {
      sessionStorage.getItem('pp.session.main') || sessionStorage.setItem('pp.session.main', 'u_driver_demo')
    } catch {}
  })
  const p = await ctx.newPage()
  await p.goto(BASE + '#/app')
  await p.locator('.pin').first().waitFor()
  await p.waitForLoadState('networkidle').catch(() => {})
  await p.waitForTimeout(1500)
  await p.screenshot({ path: path.join(out, `map-default-${label}.png`) })
  await p.getByRole('toolbar', { name: 'Filters' }).getByRole('button', { name: 'GB/T', exact: true }).click()
  await p.waitForTimeout(1500)
  await p.waitForLoadState('networkidle').catch(() => {})
  await p.waitForTimeout(1500)
  await p.screenshot({ path: path.join(out, `map-street-${label}.png`) })
  await ctx.close()
  const pc = await browser.newContext({ viewport: { width: 1280, height: 720 } })
  const P = await pc.newPage()
  await P.goto(BASE + '#/presenter')
  await P.frameLocator('iframe[name="driver"]').locator('.pin').first().waitFor({ timeout: 15000 })
  await P.waitForTimeout(3000)
  await P.screenshot({ path: path.join(out, `presenter-${label}.png`) })
  await pc.close()
} finally {
  await browser.close()
  stop()
}
console.log('saved to', out)
