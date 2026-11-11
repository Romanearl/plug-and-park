// Playwright screenshot runner.
//
//   npm run shots -- S1        → shoots the S1 scenarios into "Claude outputs1/screenshots/S1/"
//   npm run shots -- all       → re-shoots every session
//
// Builds the app, starts `vite preview` on a fixed port, runs the scenarios in fresh
// browser contexts (clean storage), and always stops the server. Fails loudly on page
// errors or console errors (font and map-tile network errors are ignored).

import { spawn, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT_ROOT = path.join(ROOT, 'Claude outputs1', 'screenshots')
const PORT = 4173
const BASE = `http://localhost:${PORT}/plug-and-park/`

const PHONE = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
const desktop = (width, height) => ({ viewport: { width, height }, deviceScaleFactor: 1 })

// ── Helpers used by scenario setups ─────────────────────────────────────────

const openDemoSheet = async (page) => {
  await page.getByRole('button', { name: /Demo only/ }).click()
  await page.getByRole('dialog', { name: 'Demo controls' }).waitFor()
  await page.waitForTimeout(400) // let the slide-up finish
}

// ── Scenarios ───────────────────────────────────────────────────────────────
// Keep old sessions' scenarios: later sessions can re-shoot everything with `all`.

const scenarios = [
  { session: 'S1', file: '00-framed-1440x900', device: desktop(1440, 900), route: '#/' },
  { session: 'S1', file: '01-landing', route: '#/' },
  { session: 'S1', file: '02-demo-sheet', route: '#/', setup: openDemoSheet },
  {
    session: 'S1',
    file: '03-demo-sheet-reset-confirm',
    route: '#/',
    setup: async (page) => {
      await openDemoSheet(page)
      await page.getByRole('button', { name: 'Reset demo' }).click()
      await page.getByRole('button', { name: 'Tap again to wipe all demo data' }).waitFor()
    },
  },
  {
    session: 'S1',
    file: '04-owner-placeholder',
    route: '#/',
    setup: async (page) => {
      await openDemoSheet(page)
      await page.getByRole('button', { name: 'Sign in as charger owner' }).click()
      await page.waitForURL(/#\/owner$/)
      await page.getByText('Wong Mei Ling').waitFor()
    },
  },
  { session: 'S1', file: '05-register-placeholder', route: '#/register' },
  { session: 'S1', file: '06-framed-1280x720', device: desktop(1280, 720), route: '#/' },

  // ── S2: auth ──
  { session: 'S2', file: '01-register-empty', route: '#/register' },
  {
    session: 'S2',
    file: '02-register-errors-top',
    route: '#/register?role=driver',
    setup: async (page) => {
      await page.getByLabel('Full name').fill('Chan Tai Man')
      await page.getByLabel('Email').fill('chan@mail')
      await page.getByLabel('Mobile number').fill('1234')
      await page.getByRole('button', { name: 'Continue' }).click({ force: true })
      await page.getByText('Enter a valid email').waitFor()
    },
  },
  {
    session: 'S2',
    file: '03-register-errors-password',
    route: '#/register?role=driver',
    setup: async (page) => {
      await page.getByLabel('Full name').fill('Chan Tai Man')
      await page.getByLabel('Email').fill('chan@mail')
      await page.getByLabel('Password', { exact: true }).fill('demo12')
      await page.getByLabel('Confirm password').fill('demo13')
      await page.getByRole('button', { name: 'Continue' }).click({ force: true })
      await page.getByText('Passwords don’t match').waitFor()
      await page.getByLabel('Email').scrollIntoViewIfNeeded()
      await page.locator('.scroll').evaluate((el) => el.scrollBy(0, 150))
    },
  },
  {
    session: 'S2',
    file: '04-register-valid',
    route: '#/register?role=driver',
    setup: async (page) => {
      await fillRegistration(page, 'new.driver@example.com')
      await page.getByRole('button', { name: 'Continue' }).scrollIntoViewIfNeeded()
    },
  },
  {
    session: 'S2',
    file: '05-register-duplicate-email',
    route: '#/register?role=driver',
    setup: async (page) => {
      await page.getByLabel('Email').fill('driver@plugpark.demo')
      await page.getByLabel('Email').blur()
      await page.getByText('An account with this email already exists').waitFor()
    },
  },
  {
    session: 'S2',
    file: '06-login-error',
    route: '#/login',
    setup: async (page) => {
      await page.getByLabel('Email').fill('driver@plugpark.demo')
      await page.getByLabel('Password', { exact: true }).fill('WrongPass1')
      await page.getByRole('button', { name: 'Log in', exact: true }).click()
      await page.getByText('Email or password is incorrect').waitFor()
    },
  },
  {
    session: 'S2',
    file: '07-login-demo-filled',
    route: '#/login',
    setup: async (page) => {
      await page.getByRole('button', { name: 'Demo driver' }).click()
    },
  },
  {
    session: 'S2',
    file: '08-login-forgot-sheet',
    route: '#/login',
    setup: async (page) => {
      await page.getByRole('button', { name: 'Forgot password?' }).click()
      await page.getByRole('dialog', { name: 'Forgot password?' }).waitFor()
      await page.waitForTimeout(400)
    },
  },
  { session: 'S2', file: '09-verify-empty', route: '#/login', setup: async (page) => loginAsDemo(page) },
  {
    session: 'S2',
    file: '10-verify-wrong-code',
    route: '#/login',
    setup: async (page) => {
      await loginAsDemo(page)
      await page.keyboard.type('654321')
      await page.getByText('That code isn’t right').waitFor()
    },
  },
  {
    session: 'S2',
    file: '11-verify-success',
    route: '#/register?role=driver',
    setup: async (page) => {
      await registerNewDriver(page)
      await page.keyboard.type('123456')
      await page.getByText('Verified').waitFor()
    },
    settle: 0,
  },
  {
    session: 'S2',
    file: '12-app-new-user',
    route: '#/register?role=driver',
    setup: async (page) => {
      await registerNewDriver(page)
      await page.keyboard.type('123456')
      await page.waitForURL(/#\/app$/)
      await page.getByText('Ho Ka Yan').waitFor()
    },
  },
]

async function fillRegistration(page, email) {
  await page.getByLabel('Full name').fill('Ho Ka Yan')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Mobile number').fill('98765432')
  await page.getByLabel('Password', { exact: true }).fill('Charge2026')
  await page.getByLabel('Confirm password').fill('Charge2026')
  await page.getByText('I agree to the Terms').click()
}

async function registerNewDriver(page) {
  await fillRegistration(page, 'ho.kayan@example.com')
  await page.getByRole('button', { name: 'Continue' }).click({ force: true })
  await page.waitForURL(/#\/verify$/)
  await page.getByLabel('Digit 1 of 6').waitFor()
}

async function loginAsDemo(page) {
  await page.getByRole('button', { name: 'Demo driver' }).click()
  await page.getByRole('button', { name: 'Log in', exact: true }).click()
  await page.waitForURL(/#\/verify$/)
  await page.getByLabel('Digit 1 of 6').waitFor()
}

// ── Server ──────────────────────────────────────────────────────────────────

// Vite's JS entry, run with node directly (no shell): cross-platform, and kill() really stops it.
const VITE_BIN = path.join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js')

function build() {
  const r = spawnSync(process.execPath, [VITE_BIN, 'build'], { cwd: ROOT, stdio: 'inherit' })
  if (r.status !== 0) throw new Error(`vite build failed (exit ${r.status})`)
}

async function waitForServer(url, timeoutMs = 20_000) {
  const until = Date.now() + timeoutMs
  while (Date.now() < until) {
    try {
      const res = await fetch(url)
      if (res.ok) return
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 250))
  }
  throw new Error(`Preview server did not start at ${url}`)
}

function startPreview() {
  return spawn(process.execPath, [VITE_BIN, 'preview', '--port', String(PORT), '--strictPort'], {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
}

function stopPreview(server) {
  if (!server || server.exitCode !== null) return
  if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(server.pid), '/T', '/F'], { stdio: 'ignore' })
  else server.kill('SIGTERM')
}

// ── Main ────────────────────────────────────────────────────────────────────

const IGNORED = /fonts\.googleapis|fonts\.gstatic|basemaps\.cartocdn|tile\.openstreetmap|favicon/i

async function main() {
  const arg = process.argv[2]
  if (!arg) throw new Error('Usage: npm run shots -- S<n>   (or: all)')
  const sessions = arg === 'all' ? [...new Set(scenarios.map((s) => s.session))] : [arg.toUpperCase()]
  const todo = scenarios.filter((s) => sessions.includes(s.session))
  if (todo.length === 0) throw new Error(`No scenarios for ${arg}`)

  build()
  const server = startPreview()
  const cleanup = () => stopPreview(server)
  process.on('SIGINT', () => {
    cleanup()
    process.exit(130)
  })

  const problems = []
  let count = 0
  let browser
  try {
    await waitForServer(BASE)
    browser = await chromium.launch()

    for (const session of sessions) {
      const dir = path.join(OUT_ROOT, session)
      fs.mkdirSync(dir, { recursive: true })
      for (const f of fs.readdirSync(dir)) if (f.endsWith('.png')) fs.rmSync(path.join(dir, f))
    }

    for (const sc of todo) {
      const context = await browser.newContext({ ...(sc.device ?? PHONE), reducedMotion: 'reduce' })
      const page = await context.newPage()
      const tag = `${sc.session}/${sc.file}`
      page.on('pageerror', (err) => problems.push(`${tag}: page error: ${err.message}`))
      page.on('console', (msg) => {
        if (msg.type() !== 'error') return
        const where = msg.location()?.url ?? ''
        if (IGNORED.test(msg.text()) || IGNORED.test(where)) return
        problems.push(`${tag}: console error: ${msg.text()}`)
      })
      page.on('requestfailed', (req) => {
        if (!IGNORED.test(req.url())) problems.push(`${tag}: request failed: ${req.url()}`)
      })

      await page.goto(BASE + sc.route, { waitUntil: 'networkidle' })
      await page.evaluate(() => document.fonts.ready)
      if (sc.setup) await sc.setup(page)
      await page.waitForTimeout(sc.settle ?? 300)
      const out = path.join(OUT_ROOT, sc.session, `${sc.file}.png`)
      await page.screenshot({ path: out })
      console.log(`  ✓ ${path.relative(ROOT, out)}`)
      count++
      await context.close()
    }
  } finally {
    await browser?.close()
    cleanup()
  }

  if (problems.length) {
    console.error(`\n✗ ${problems.length} problem(s):\n  ` + problems.join('\n  '))
    process.exit(1)
  }
  console.log(`\n${count} screenshot(s), no errors.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
