// Checks the S1 "done when" items against a running `vite preview` on :4173.
// Run via `npm run check` (or with `npm run preview` running: node scripts/checks/s1.mjs)
import { chromium } from 'playwright'

const BASE = process.env.PP_BASE ?? 'http://localhost:4173/plug-and-park/'
const results = []
const check = (name, ok, extra = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? ' - ' + extra : ''}`)

const seen = (loc) => loc.waitFor({ timeout: 3000 }).then(() => true, () => false)
const browser = await chromium.launch()

// 1. Phone vs framed
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  const p = await ctx.newPage()
  await p.goto(BASE + '#/')
  const full = await p.locator('.stage.full').count()
  const bar = await p.locator('.status-bar').count()
  const box = await p.locator('.screen').boundingBox()
  check('390x844: full screen, no frame/status bar', full === 1 && bar === 0 && box.width === 390 && box.height === 844, JSON.stringify(box))
  await ctx.close()
}
for (const [w, h] of [[520, 900], [1280, 720], [1440, 900]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } })
  const p = await ctx.newPage()
  await p.goto(BASE + '#/')
  const box = await p.locator('.device').boundingBox()
  const fits = box.x >= 0 && box.y >= 0 && box.x + box.width <= w && box.y + box.height <= h
  const caption = await p.locator('.stage-caption').count()
  check(`${w}x${h}: framed, fits viewport${w >= 1000 ? ', caption shown' : ', no caption'}`, fits && (w >= 1000 ? caption === 1 : caption === 0), `device ${Math.round(box.width)}x${Math.round(box.height)} at ${Math.round(box.x)},${Math.round(box.y)}`)
  await ctx.close()
}

// 2. Persistence, per-window session, cross-tab sync, reset
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const a = await ctx.newPage()
  await a.goto(BASE + '#/')
  await a.getByRole('button', { name: /Demo only/ }).click()
  await a.getByRole('button', { name: 'Sign in as charger owner' }).click()
  await a.waitForURL(/#\/owner$/)
  check('Demo sheet -> owner -> #/owner shows name', await a.getByText('Wong Mei Ling').isVisible())

  // Driver sign-in in a second tab
  const b = await ctx.newPage()
  await b.goto(BASE + '#/owner')
  check('Tab B starts signed out (per-window session)', (await b.getByText('Signed in as').count()) === 0)
  await b.getByRole('button', { name: /Demo only/ }).click()
  await b.getByRole('button', { name: 'Sign in as driver' }).click()
  await b.waitForURL(/#\/app$/)
  check('Demo sheet -> driver -> #/app shows name', await b.getByText('Chan Tai Man').isVisible())
  await a.reload()
  check('Tab A still owner after B signed in as driver + reload', await a.getByText('Wong Mei Ling').isVisible())

  // Change data in tab A -> appears live in tab B
  await a.evaluate(() => {
    const db = JSON.parse(localStorage.getItem('pp.db'))
    db.users.find((u) => u.id === 'u_driver_demo').name = 'Edited In Tab A'
    localStorage.setItem('pp.db', JSON.stringify(db))
  })
  await b.reload() // reload = persistence check (and B picks up the change)
  check('Data change persists across reload', await b.getByText('Edited In Tab A').isVisible())

  // Reset in tab A -> B returns to seed live (no reload)
  await a.getByRole('button', { name: /Demo only/ }).click()
  await a.getByRole('button', { name: 'Reset demo' }).click()
  await a.getByRole('button', { name: 'Tap again to wipe all demo data' }).click()
  await a.waitForURL(/#\/$/)
  check('Reset -> tab A at #/ and signed out', await seen(a.getByText('Charge where')))
  await b.getByText('Chan Tai Man').waitFor({ timeout: 3000 }).catch(() => {})
  check('Reset in A -> tab B live-updates to seed data', await b.getByText('Chan Tai Man').isVisible())
  check('Reset in A does not sign out tab B', (await b.getByText('Signed in as').count()) === 1)

  // Sign out only affects this window
  await b.getByRole('button', { name: 'Sign out' }).click()
  check('Sign out clears session', (await b.getByText('Signed in as').count()) === 0)
  await ctx.close()
}

// 3. Deep link hard refresh + 404 + back button fallback
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const p = await ctx.newPage()
  const res = await p.goto(BASE + '#/owner')
  await p.reload()
  check('Deep link #/owner after hard refresh', res.ok() && (await p.getByRole('heading', { name: 'Owner dashboard' }).isVisible()))
  await p.goto(BASE + '#/nope')
  check('Unknown route -> Page not found', await p.getByRole('heading', { name: 'Page not found' }).isVisible())
  await p.getByRole('button', { name: 'Back', exact: true }).click()
  check('Back on deep link falls back to landing', await p.getByText('Charge where').isVisible())
  await p.getByRole('button', { name: /Get started/ }).click()
  await p.getByRole('button', { name: 'Back', exact: true }).click()
  check('Get started -> register -> back -> landing', await p.getByText('Charge where').isVisible())
  await p.getByRole('button', { name: 'I already have an account' }).click()
  check('Login placeholder', await seen(p.getByRole('heading', { name: 'Log in' })))
  await ctx.close()
}

await browser.close()
console.log(results.join('\n'))
process.exit(results.some((r) => r.startsWith('FAIL')) ? 1 : 0)

