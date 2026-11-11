// One-off: renders the app icon (white bolt on --blue) to PNGs for the web app manifest.
//   node scripts/make-icons.mjs   → public/icons/icon-192.png, icon-512.png, apple-touch-icon.png (180)
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'
import { ROOT } from './lib/server.mjs'

// Full-bleed square (no transparent corners) so it also works as a maskable icon; the bolt sits
// inside the central 80% safe zone.
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#7399C6"/>
  <path d="M286 92 150 284h98l-28 136 142-200h-98l22-128z" fill="#fff"/>
</svg>`

const out = path.join(ROOT, 'public', 'icons')
fs.mkdirSync(out, { recursive: true })
const browser = await chromium.launch()
for (const [name, size] of [['icon-192.png', 192], ['icon-512.png', 512], ['apple-touch-icon.png', 180]]) {
  const page = await browser.newPage({ viewport: { width: size, height: size } })
  await page.setContent(`<html><body style="margin:0">${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`)
  await page.screenshot({ path: path.join(out, name), omitBackground: false })
  await page.close()
  console.log('wrote', name)
}
await browser.close()
