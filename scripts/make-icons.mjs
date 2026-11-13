// Copies Roman's app icon from "Claude outputs1/app-icon/" into public/. It never draws an icon itself.
//   node scripts/make-icons.mjs
// The files are shipped byte-for-byte (scripts/checks/icon.mjs verifies it). After changing the icon,
// bump the ?v= number in index.html and public/manifest.webmanifest so phones drop the cached one.
import fs from 'node:fs'
import path from 'node:path'
import { ROOT } from './lib/server.mjs'

export const ICON_SOURCE = path.join(ROOT, 'Claude outputs1', 'app-icon')
/** Source file name → path inside public/. */
export const ICON_FILES = {
  'favicon.svg': 'favicon.svg',
  'favicon-32.png': 'icons/favicon-32.png',
  'favicon-16.png': 'icons/favicon-16.png',
  'apple-touch-icon.png': 'icons/apple-touch-icon.png',
  'icon-192.png': 'icons/icon-192.png',
  'icon-512.png': 'icons/icon-512.png',
  'icon-maskable-192.png': 'icons/icon-maskable-192.png',
  'icon-maskable-512.png': 'icons/icon-maskable-512.png',
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  for (const [from, to] of Object.entries(ICON_FILES)) {
    const dest = path.join(ROOT, 'public', ...to.split('/'))
    fs.mkdirSync(path.dirname(dest), { recursive: true })
    fs.copyFileSync(path.join(ICON_SOURCE, from), dest)
    console.log('copied', from, '→ public/' + to)
  }
}
