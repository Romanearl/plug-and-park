import { useState } from 'react'
import { BottomSheet } from '../../components/BottomSheet'
import { AuthHeader, PasswordField, TextField } from '../../components/Field'
import { Icon } from '../../components/Icon'
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from '../../data/seed'
import { checkLogin, setPending } from '../../lib/auth'
import { back, Link, navigate } from '../../lib/router'
import { useForm } from '../../lib/useForm'
import { cx } from '../../lib/util'
import { validateEmail } from '../../lib/validation'

export function Login() {
  const [failed, setFailed] = useState(false)
  const [forgotOpen, setForgotOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  const f = useForm(
    { email: '', password: '' },
    {
      email: validateEmail,
      password: (x) => (x ? null : 'Enter your password'),
    },
  )
  const { values: v, error } = f

  const submit = () => {
    setFailed(false)
    if (!f.submitAll()) return
    setBusy(true)
    // A short pause so the check feels like a real request.
    window.setTimeout(() => {
      setBusy(false)
      const user = checkLogin(v.email, v.password)
      if (!user) {
        setFailed(true)
        return
      }
      setPending({ kind: 'login', userId: user.id })
      navigate('/verify')
    }, 450)
  }

  const demo = (kind: 'driver' | 'owner') => {
    setFailed(false)
    f.fill({ email: DEMO_ACCOUNTS[kind].email, password: DEMO_PASSWORD })
  }

  return (
    <div className="screen-view">
      <div className="scroll">
        <AuthHeader title="Log in" sub="Welcome back. We’ll text you a code to confirm it’s you." onBack={() => back('/')} />
        <form
          className="page stack rise-2"
          style={{ gap: 18, paddingTop: 16, paddingBottom: 24 }}
          noValidate
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
        >
          {failed && (
            <div className="banner error" role="alert">
              <Icon name="info" size={20} />
              Email or password is incorrect
            </div>
          )}
          <TextField
            label="Email"
            type="email"
            inputMode="email"
            autoComplete="username"
            autoCapitalize="off"
            spellCheck={false}
            value={v.email}
            onChange={(x) => f.set('email', x)}
            onBlur={() => f.blur('email')}
            error={error.email}
            placeholder="name@example.com"
          />
          <div className="stack" style={{ gap: 8 }}>
            <PasswordField
              label="Password"
              value={v.password}
              onChange={(x) => f.set('password', x)}
              onBlur={() => f.blur('password')}
              error={error.password}
              autoComplete="current-password"
            />
            <button type="button" className="text-link" style={{ alignSelf: 'flex-start' }} onClick={() => setForgotOpen(true)}>
              Forgot password?
            </button>
          </div>

          <button
            type="submit"
            className={cx('btn btn-primary block', !f.valid && 'is-disabled')}
            aria-disabled={!f.valid}
            disabled={busy}
          >
            {busy ? <span className="spinner" aria-label="Checking" /> : 'Log in'}
          </button>

          <div className="or-divider">
            <span>or try a demo account</span>
          </div>
          <div className="row" style={{ gap: 10 }}>
            <button type="button" className="btn btn-secondary" style={{ flex: 1, minWidth: 0, padding: '0 12px' }} onClick={() => demo('driver')}>
              <Icon name="car" size={20} /> Demo driver
            </button>
            <button type="button" className="btn btn-secondary" style={{ flex: 1, minWidth: 0, padding: '0 12px' }} onClick={() => demo('owner')}>
              <Icon name="plug" size={20} /> Demo owner
            </button>
          </div>

          <p className="caption" style={{ textAlign: 'center', fontSize: 15, marginTop: 4 }}>
            New to Plug &amp; Park?{' '}
            <Link to="/register" replace className="text-link">
              Create an account
            </Link>
          </p>
        </form>
      </div>

      <BottomSheet open={forgotOpen} onClose={() => setForgotOpen(false)} title="Forgot password?" labelId="forgot-title">
        <div className="banner info" style={{ marginTop: 4 }}>
          <Icon name="info" size={20} />
          <span>
            Demo only — use <b>{DEMO_PASSWORD}</b>
          </span>
        </div>
        <p className="muted" style={{ marginTop: 12 }}>
          In the real app we’d email you a reset link. This prototype doesn’t send emails.
        </p>
        <button className="btn btn-primary block" style={{ marginTop: 20 }} onClick={() => setForgotOpen(false)}>
          Got it
        </button>
      </BottomSheet>
    </div>
  )
}
