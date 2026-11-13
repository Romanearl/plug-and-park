// App icon checks (COLOUR_REVERT_AND_ICON_TASK.md, part B). Run via `npm run check`
// (or with `npm run preview` running: node scripts/checks/icon.mjs).
//  1. Every icon that index.html or the manifest points at is served from the build.
//  2. PNGs have the size their name or manifest entry claims.
//  3. What ships is byte-identical to Roman's files in "Claude outputs1/app-icon/".
//  4. No old "P&P" / bolt icon is left in public/ or dist/.
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const BASE = process.env.PP_BASE ?? 'http://localhost:4173/plug-and-park/'
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const SOURCE = path.join(ROOT, 'Claude outputs1', 'app-icon')
const { ICON_FILES } = await import(new URL('../make-icons.mjs', import.meta.url))
const results = []
const check = (name, ok, extra = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? ' - ' + extra : ''}`)
const sha = (buf) => crypto.createHash('sha256').update(buf).digest('hex')
const pngSize = (buf) => (buf.length > 24 && buf.readUInt32BE(12) === 0x49484452 ? `${buf.readUInt32BE(16)}x${buf.readUInt32BE(20)}` : null)
const origin = new URL(BASE).origin
const fetchBuf = async (href) => {
  const r = await fetch(new URL(href, href.startsWith('/') ? origin : BASE).href)
  return { ok: r.ok, type: r.headers.get('content-type') ?? '', buf: Buffer.from(await r.arrayBuffer()) }
}
const sourceHashes = new Map(fs.readdirSync(SOURCE).map((f) => [sha(fs.readFileSync(path.join(SOURCE, f))), f]))

// ── 1 + 2 + 3: index.html ──
const html = await (await fetch(BASE)).text()
const links = [...html.matchAll(/<link[^>]+rel="(icon|apple-touch-icon)"[^>]*>/g)].map((m) => ({
  rel: m[1],
  href: /href="([^"]+)"/.exec(m[0])[1],
  sizes: /sizes="([^"]+)"/.exec(m[0])?.[1],
}))
check('index.html links an SVG favicon, PNG favicons and an apple-touch-icon', links.some((l) => l.href.includes('favicon.svg')) && links.some((l) => /favicon-32\.png/.test(l.href)) && links.some((l) => l.rel === 'apple-touch-icon'), links.map((l) => l.href).join(' '))
check('Icon links carry a ?v= cache buster', links.every((l) => /\?v=\d+/.test(l.href)), links.filter((l) => !/\?v=/.test(l.href)).map((l) => l.href).join(' '))
for (const l of links) {
  const r = await fetchBuf(l.href)
  const size = pngSize(r.buf)
  const want = l.sizes ?? (l.rel === 'apple-touch-icon' ? '180x180' : null)
  check(`${l.href} is served`, r.ok && r.buf.length > 0, `${r.buf.length} bytes`)
  if (want) check(`${l.href} is ${want}`, size === want, size ?? 'not a PNG')
  check(`${l.href} is byte-identical to a file in app-icon/`, sourceHashes.has(sha(r.buf)), sourceHashes.get(sha(r.buf)) ?? 'no match')
}

// ── manifest ──
const manHref = /<link[^>]+rel="manifest"[^>]+href="([^"]+)"/.exec(html)?.[1]
const man = manHref ? JSON.parse((await fetchBuf(manHref)).buf.toString('utf8')) : null
check('Manifest is linked and parses', !!man, manHref ?? 'no link')
const icons = man?.icons ?? []
check('Manifest has "any" and "maskable" icons at 192 and 512', ['192x192', '512x512'].every((s) => icons.some((i) => i.sizes === s && i.purpose === 'any') && icons.some((i) => i.sizes === s && i.purpose === 'maskable')), icons.map((i) => `${i.sizes}/${i.purpose}`).join(' '))
check('Manifest theme and background are black', man?.theme_color === '#000000' && man?.background_color === '#000000')
for (const i of icons) {
  const r = await fetchBuf(i.src)
  check(`${i.src} is served as a PNG of ${i.sizes}`, r.ok && r.type.includes('png') && pngSize(r.buf) === i.sizes, pngSize(r.buf) ?? 'not a PNG')
  const src = sourceHashes.get(sha(r.buf))
  check(`${i.src} is byte-identical to app-icon/${i.purpose === 'maskable' ? 'icon-maskable-*' : 'icon-*'}`, !!src && (i.purpose === 'maskable') === src.includes('maskable'), src ?? 'no match')
}

// ── 3: every file make-icons.mjs ships matches its source, in public/ and in dist/ ──
for (const [from, to] of Object.entries(ICON_FILES)) {
  const want = sha(fs.readFileSync(path.join(SOURCE, from)))
  for (const dir of ['public', 'dist']) {
    const file = path.join(ROOT, dir, ...to.split('/'))
    check(`${dir}/${to} = app-icon/${from}`, fs.existsSync(file) && sha(fs.readFileSync(file)) === want)
  }
}
check('appicon-preview.png is not shipped', !fs.existsSync(path.join(ROOT, 'public', 'appicon-preview.png')) && !fs.existsSync(path.join(ROOT, 'dist', 'appicon-preview.png')))

// ── 4: no old icon left ──
// The old icons were a lightning bolt on a square (favicon path "M36 8 16 36h14…", PNG icons drawn by the old
// make-icons.mjs) or the "P&P" wordmark. Every image directly in public/, public/icons/ and their dist/ copies
// must be one of Roman's files.
const OLD_BOLT = /M36 8 16 36h14|M286 92 150 284h98/
const leftovers = []
for (const dir of ['public', 'public/icons', 'dist', 'dist/icons']) {
  const full = path.join(ROOT, ...dir.split('/'))
  if (!fs.existsSync(full)) continue
  for (const f of fs.readdirSync(full)) {
    if (!/\.(png|svg|ico)$/i.test(f)) continue
    const buf = fs.readFileSync(path.join(full, f))
    if (!sourceHashes.has(sha(buf))) leftovers.push(`${dir}/${f}`)
    else if (/\.svg$/i.test(f) && (OLD_BOLT.test(buf.toString('utf8')) || /P&amp;P|>P&P</.test(buf.toString('utf8')))) leftovers.push(`${dir}/${f} (old drawing)`)
  }
}
check('No old or "P&P" icon left in public/ or dist/ (every icon file is one of Roman\'s)', leftovers.length === 0, leftovers.join(' '))
check('make-icons.mjs copies files and never draws an icon', !/setContent|screenshot|<svg/.test(fs.readFileSync(path.join(ROOT, 'scripts', 'make-icons.mjs'), 'utf8')))

console.log(results.join('\n'))
const failed = results.filter((r) => r.startsWith('FAIL')).length
console.log(`\n${results.length - failed}/${results.length} passed`)
process.exit(failed ? 1 : 0)
