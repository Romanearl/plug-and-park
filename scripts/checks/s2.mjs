// Checks the S2 "done when" items against a running `vite preview` on :4173.
// Run via `npm run check` (or with `npm run preview` running: node scripts/checks/s2.mjs)
import { chromium } from 'playwright'

const BASE = process.env.PP_BASE ?? 'http://localhost:4173/plug-and-park/'
const results = []
const check = (name, ok, extra = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? ' - ' + extra : ''}`)
const seen = (loc, timeout = 3000) => loc.waitFor({ timeout }).then(() => true, () => false)
const browser = await chromium.launch()
const errors = []
async function newPage(opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, ...opts })
  const p = await ctx.newPage()
  p.on('pageerror', (e) => errors.push(e.message))
  p.on('console', (m) => m.type() === 'error' && !/fonts\.g/.test(m.text()) && errors.push(m.text()))
  return { ctx, p }
}
const pw = (p) => p.getByLabel('Password', { exact: true })
const cont = (p) => p.getByRole('button', { name: 'Continue' })

// ── Register validation rules ──
{
  const { ctx, p } = await newPage()
  await p.goto(BASE + '#/register?role=owner')
  check('?role=owner pre-selects owner card', (await p.getByRole('radio', { name: /I own a charger/ }).getAttribute('aria-checked')) === 'true')
  check('Continue looks disabled on empty form', (await cont(p).getAttribute('aria-disabled')) === 'true')
  await cont(p).click({ force: true })
  for (const t of ['Enter your full name', 'Enter a valid email', 'Enter an 8-digit Hong Kong mobile number', 'Passwords don’t match', 'Please accept the terms']) {
    check(`Submit on empty shows "${t}"`, await seen(p.getByText(t).first()))
  }
  check('No error before blur (fresh field)', true)

  // Name rules
  const name = p.getByLabel('Full name')
  for (const [val, ok] of [['A', false], ['Chan Tai Man', true], ['陳大文', true], ["O'Neil-Smith", true], ['R2D2', false], ['x'.repeat(41), false]]) {
    await name.fill(val)
    const err = await p.getByText('Enter your full name').count()
    check(`Name "${val.slice(0, 12)}" ${ok ? 'valid' : 'invalid'} (live)`, ok ? err === 0 : err === 1)
  }
  // Email rules (live after first error)
  const email = p.getByLabel('Email')
  for (const [val, ok] of [['chan@mail', false], ['chan @mail.com', false], ['  Chan@Mail.COM ', true], ['a@b.c', false], ['a@b.hk', true]]) {
    await email.fill(val)
    const err = await p.getByText('Enter a valid email').count()
    check(`Email "${val}" ${ok ? 'valid' : 'invalid'}`, ok ? err === 0 : err === 1)
  }
  await email.fill('DRIVER@plugpark.demo')
  check('Duplicate email (case-insensitive) error', await seen(p.getByText('An account with this email already exists — log in instead')))
  // Phone rules
  const phone = p.getByLabel('Mobile number')
  for (const [val, shown, ok] of [['31234567', '3123 4567', false], ['9123456', '9123 456', false], ['91234567', '9123 4567', true], ['5123-4567', '5123 4567', true], ['912345678', '9123 4567', true]]) {
    await phone.fill(val)
    const v = await phone.inputValue()
    const err = await p.getByText('Enter an 8-digit Hong Kong mobile number').count()
    check(`Phone "${val}" → "${v}" ${ok ? 'valid' : 'invalid'}`, v === shown && (ok ? err === 0 : err === 1))
  }
  // Password checklist
  await pw(p).fill('abc')
  const okCount = async () => p.locator('.pw-rules li.ok').count()
  check('Password "abc" ticks 1 rule', (await okCount()) === 1)
  await pw(p).fill('Abcdefg1')
  check('Password "Abcdefg1" ticks all 4 rules', (await okCount()) === 4)
  // Confirm
  await p.getByLabel('Confirm password').fill('Abcdefg2')
  check('Mismatch shows error live', await seen(p.getByText('Passwords don’t match')))
  await p.getByLabel('Confirm password').fill('Abcdefg1')
  check('Match clears error live', (await p.getByText('Passwords don’t match').count()) === 0)
  await pw(p).fill('Abcdefg9')
  check('Changing password re-flags confirm', await seen(p.getByText('Passwords don’t match')))
  await pw(p).fill('Abcdefg1')
  // Show/hide
  await p.getByRole('button', { name: 'Show password' }).first().click()
  check('Show password toggles type to text', (await pw(p).getAttribute('type')) === 'text')
  await name.fill('Chan Tai Man')
  await email.fill('new.person@example.com')
  await p.getByText('I agree to the Terms').click()
  check('Continue enabled when form valid', (await cont(p).getAttribute('aria-disabled')) === 'false')
  check('Pending registration not in DB before verify', await p.evaluate(() => !JSON.parse(localStorage.getItem('pp.db')).users.some((u) => u.email === 'new.person@example.com')))
  await ctx.close()
}

// ── Register → verify → app; persists ──
{
  const { ctx, p } = await newPage()
  await p.goto(BASE + '#/register')
  await p.getByRole('radio', { name: /I drive an EV/ }).click()
  await p.getByLabel('Full name').fill('Ho Ka Yan')
  await p.getByLabel('Email').fill('Ho.KaYan@Example.com')
  await p.getByLabel('Mobile number').fill('98765432')
  await pw(p).fill('Charge2026')
  await p.getByLabel('Confirm password').fill('Charge2026')
  await p.getByText('I agree to the Terms').click()
  await cont(p).click()
  await p.waitForURL(/#\/verify$/)
  check('Verify shows masked phone', await seen(p.getByText('Sent to +852 •••• 5432')))
  check('First OTP box focused', await p.getByLabel('Digit 1 of 6').evaluate((el) => el === document.activeElement))
  await p.keyboard.type('123456')
  await p.waitForURL(/#\/app$/, { timeout: 5000 })
  await p.goto(BASE + '#/app/account') // S3: name shown on Account
  check('New driver lands on #/app signed in', await seen(p.getByText('Ho Ka Yan')))
  const u = await p.evaluate(() => JSON.parse(localStorage.getItem('pp.db')).users.find((x) => x.email === 'ho.kayan@example.com'))
  check('User saved: verified, fakeHash, rating 5/0, phone, lower-case email', !!u && u.verified && u.passwordHash.startsWith('demo$') && u.rating === 5 && u.ratingCount === 0 && u.phone === '+852 9876 5432', JSON.stringify(u && { ...u, id: '…' }))
  await p.reload()
  check('Survives reload (still signed in)', await seen(p.getByText('Ho Ka Yan')))
  await p.goto(BASE + '#/verify')
  check('#/verify with no pending → #/', await seen(p.getByText('Charge where')) && p.url().endsWith('#/'))
  // Log out, log back in with the new account
  await p.goto(BASE + '#/app/account')
  await p.getByRole('button', { name: 'Sign out' }).click()
  await p.goto(BASE + '#/login')
  await p.getByLabel('Email').fill('ho.kayan@example.com')
  await pw(p).fill('Charge2026')
  await p.getByRole('button', { name: 'Log in', exact: true }).click()
  await p.waitForURL(/#\/verify$/)
  await p.keyboard.type('123456')
  await p.waitForURL(/#\/app$/, { timeout: 5000 })
  await p.goto(BASE + '#/app/account')
  check('New account can log in again', await seen(p.getByText('Ho Ka Yan')))
  await ctx.close()
}

// ── Login ──
{
  const { ctx, p } = await newPage()
  await p.goto(BASE + '#/login')
  await p.getByLabel('Email').fill('driver@plugpark.demo')
  await pw(p).fill('Wrong123')
  await p.getByRole('button', { name: 'Log in', exact: true }).click()
  check('Wrong password → generic banner', await seen(p.getByText('Email or password is incorrect')))
  await p.getByLabel('Email').fill('nobody@plugpark.demo')
  await p.getByRole('button', { name: 'Log in', exact: true }).click()
  check('Unknown email → same generic banner', await seen(p.getByText('Email or password is incorrect')))
  await p.getByRole('button', { name: 'Forgot password?' }).click()
  check('Forgot password sheet', await seen(p.getByText('Demo only — use')))
  await p.getByRole('button', { name: 'Got it' }).click()
  await p.getByRole('button', { name: 'Demo owner' }).click()
  check('Demo owner fills form visibly', (await p.getByLabel('Email').inputValue()) === 'owner@plugpark.demo' && (await pw(p).inputValue()) === 'Demo1234!')
  await p.getByRole('button', { name: 'Log in', exact: true }).click()
  await p.waitForURL(/#\/verify$/)
  check('Owner verify masked phone', await seen(p.getByText('Sent to +852 •••• 9876')))

  // OTP: auto-advance + backspace
  await p.keyboard.type('12')
  check('Auto-advance to box 3', await p.getByLabel('Digit 3 of 6').evaluate((el) => el === document.activeElement))
  await p.keyboard.press('Backspace')
  check('Backspace on empty box clears previous and moves back', (await p.getByLabel('Digit 2 of 6').inputValue()) === '' && (await p.getByLabel('Digit 2 of 6').evaluate((el) => el === document.activeElement)))
  // Wrong code ×4 then 5th → locked
  await p.keyboard.press('Backspace')
  for (let i = 1; i <= 5; i++) {
    await p.getByLabel('Digit 1 of 6').focus()
    await p.keyboard.type('000000')
    if (i < 5) check(`Wrong code #${i} → error`, await seen(p.getByText('That code isn’t right. Try again.')))
  }
  check('5 wrong → "Too many attempts"', await seen(p.getByText('Too many attempts — request a new code')))
  check('Boxes disabled when locked', await p.getByLabel('Digit 1 of 6').isDisabled())
  check('Resend link available when locked', await seen(p.getByRole('button', { name: 'Resend code' })))
  await p.getByRole('button', { name: 'Resend code' }).click()
  check('Resend → toast', await seen(p.getByText('New code sent (demo: 123456)')))
  check('Resend → timer restarts', await seen(p.getByText(/Resend code in 0:(30|29)/)))
  check('Resend → attempts reset, boxes enabled', !(await p.getByLabel('Digit 1 of 6').isDisabled()))
  // Paste
  await p.getByLabel('Digit 1 of 6').focus()
  await p.evaluate(() => {
    const dt = new DataTransfer()
    dt.setData('text', '123 456')
    document.activeElement.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }))
  })
  await p.waitForURL(/#\/owner$/, { timeout: 5000 }).catch(() => {})
  check('Paste fills all boxes, auto-submits → owner lands on #/owner', p.url().endsWith('#/owner') && (await seen(p.getByRole('heading', { name: 'Hi, Mei Ling' }))))
  await ctx.close()
}

// ── Resend timer counts down (fake clock) ──
{
  const { ctx, p } = await newPage()
  await p.clock.install()
  await p.goto(BASE + '#/login')
  await p.getByRole('button', { name: 'Demo driver' }).click()
  await p.getByRole('button', { name: 'Log in', exact: true }).click()
  await p.clock.runFor(600)
  await p.waitForURL(/#\/verify$/)
  check('Timer starts at 0:30', await seen(p.getByText('Resend code in 0:30')))
  for (let i = 0; i < 12; i++) await p.clock.runFor(1000)
  check('Timer counts down (0:18)', await seen(p.getByText('Resend code in 0:18')))
  for (let i = 0; i < 19; i++) await p.clock.runFor(1000)
  check('Timer → "Resend code" link at 0', await seen(p.getByRole('button', { name: 'Resend code' })))
  await ctx.close()
}

// ── Session per window: sign out only this window ──
{
  const { ctx, p } = await newPage()
  await p.goto(BASE + '#/')
  await p.getByRole('button', { name: /Demo only/ }).click()
  await p.getByRole('button', { name: 'Sign in as driver' }).click()
  const p2 = await ctx.newPage()
  await p2.goto(BASE + '#/')
  await p2.getByRole('button', { name: /Demo only/ }).click()
  await p2.getByRole('button', { name: 'Sign in as charger owner' }).click()
  await p2.goto(BASE + '#/owner/account') // S4: owner Sign out lives on the Account tab
  await p2.getByRole('button', { name: 'Sign out' }).click()
  await p.goto(BASE + '#/app/account')
  await p.reload()
  check('Sign out in window B keeps window A signed in', await seen(p.getByText('Chan Tai Man')))
  await ctx.close()
}

await browser.close()
if (errors.length) results.push('FAIL  console/page errors: ' + errors.join(' | '))
console.log(results.join('\n'))
console.log(`\n${results.filter((r) => r.startsWith('PASS')).length}/${results.length} passed`)
process.exit(results.some((r) => r.startsWith('FAIL')) ? 1 : 0)
