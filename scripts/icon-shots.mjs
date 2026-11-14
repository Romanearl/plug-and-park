// COLOUR-REVERT evidence for the new app icon (run with `npm run preview` running, or PP_BASE = the live URL):
//   "Claude outputs1/screenshots/COLOUR-REVERT/16-favicon-tab.png"   the favicon as the browser serves it, in a tab strip
//   "Claude outputs1/screenshots/COLOUR-REVERT/17-manifest-icons.png" every manifest icon at 192 px, plus the iOS icon
// Headless Chromium has no real tab strip, so the tab is drawn around the favicon the app actually serves.
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'
import { ROOT } from './lib/server.mjs'

const BASE = process.env.PP_BASE ?? 'http://localhost:4173/plug-and-park/'
// Output folder: COLOUR-REVERT by default, or the folder named as the first argument (e.g. NAVY-RESTORE).
const out = path.join(ROOT, 'Claude outputs1', 'screenshots', process.argv[2] ?? 'COLOUR-REVERT')
fs.mkdirSync(out, { recursive: true })
const b = await chromium.launch()
const p = await b.newPage({ deviceScaleFactor: 2 })
await p.goto(BASE + '#/')
const icons = await p.evaluate(async () => {
  const abs = (h) => new URL(h, location.href).href
  const svg = abs(document.querySelector('link[rel="icon"][type="image/svg+xml"]').getAttribute('href'))
  const png = abs(document.querySelector('link[rel="icon"][sizes="32x32"]').getAttribute('href'))
  const apple = abs(document.querySelector('link[rel="apple-touch-icon"]').getAttribute('href'))
  const man = await (await fetch(document.querySelector('link[rel="manifest"]').href)).json()
  return { svg, png, apple, title: document.title, manifest: man.icons.map((i) => ({ src: abs(i.src), label: `${i.sizes} · ${i.purpose}` })) }
})
const font = 'font-family:Segoe UI,Arial,sans-serif'
await p.setViewportSize({ width: 560, height: 120 })
await p.setContent(`<body style="margin:0;background:#dee1e6;${font}">
  <div style="display:flex;align-items:flex-end;height:46px;padding:0 10px">
    <div style="display:flex;align-items:center;gap:8px;width:240px;height:36px;padding:0 12px;background:#fff;border-radius:10px 10px 0 0;font-size:13px">
      <img src="${icons.svg}" width="16" height="16"><span>${icons.title}</span><span style="margin-left:auto;color:#5f6368">✕</span></div>
    <div style="display:flex;align-items:center;gap:8px;width:200px;height:36px;padding:0 12px;font-size:13px;color:#3c4043">
      <img src="${icons.png}" width="16" height="16"><span>${icons.title} (PNG fallback)</span></div>
  </div>
  <div style="height:38px;background:#fff;display:flex;align-items:center;padding:0 14px;font-size:13px;color:#5f6368">${BASE}#/</div>
  <div style="padding:8px 14px;font-size:11px;color:#5f6368">favicon.svg (left tab) and favicon-32.png (right tab), as served by the app</div></body>`)
await p.waitForTimeout(400)
await p.screenshot({ path: path.join(out, '16-favicon-tab.png') })
const cards = [...icons.manifest, { src: icons.apple, label: '180×180 · apple-touch-icon (shown at 192)' }]
await p.setViewportSize({ width: 40 + cards.length * 232, height: 300 })
await p.setContent(`<body style="margin:0;padding:20px;background:#f3f3f3;display:flex;gap:32px;${font}">${cards
  .map((c) => `<figure style="margin:0;text-align:center"><img src="${c.src}" width="192" height="192" style="display:block;border-radius:${/maskable|apple/.test(c.label) ? '42px' : '0'}"><figcaption style="font-size:12px;margin-top:8px;color:#333">${c.label}</figcaption></figure>`)
  .join('')}</body>`)
await p.waitForTimeout(500)
await p.screenshot({ path: path.join(out, '17-manifest-icons.png') })
await b.close()
console.log('wrote 16-favicon-tab.png and 17-manifest-icons.png')
