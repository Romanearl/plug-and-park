import { AuthHeader, Checkbox, PasswordField, TextField } from '../../components/Field'
import { Icon, type IconName } from '../../components/Icon'
import type { Role } from '../../data/types'
import { setPending } from '../../lib/auth'
import { back, Link, navigate, useQuery } from '../../lib/router'
import { getDB } from '../../lib/store'
import { useForm } from '../../lib/useForm'
import { cx, fakeHash } from '../../lib/util'
import {
  formatPhone,
  normalizeEmail,
  phoneDigits,
  validateConfirm,
  validateName,
  validateNewEmail,
  validatePassword,
  validatePhone,
  validateTerms,
} from '../../lib/validation'

type Values = {
  role: Role | ''
  name: string
  email: string
  phone: string
  password: string
  confirm: string
  terms: boolean
}

export function Register() {
  const q = useQuery().get('role')
  const initialRole: Role | '' = q === 'driver' || q === 'owner' ? q : ''

  const f = useForm<Values>(
    { role: initialRole, name: '', email: '', phone: '', password: '', confirm: '', terms: false },
    {
      role: (v) => (v ? null : 'Choose how you’ll use Plug & Park'),
      name: validateName,
      email: (v) => validateNewEmail(v, getDB().users),
      phone: validatePhone,
      password: validatePassword,
      confirm: (v, all) => validateConfirm(all.password, v),
      terms: validateTerms,
    },
  )
  const { values: v, error } = f

  const submit = () => {
    if (!f.submitAll() || !v.role) return
    setPending({
      kind: 'register',
      user: {
        role: v.role,
        name: v.name.trim().replace(/\s+/g, ' '),
        email: normalizeEmail(v.email),
        phone: `+852 ${formatPhone(v.phone)}`,
        passwordHash: fakeHash(v.password),
      },
    })
    navigate('/verify')
  }

  return (
    <div className="screen-view">
      <div className="scroll">
        <AuthHeader title="Create your account" onBack={() => back('/')} />
        <form
          className="page stack rise-2"
          style={{ gap: 18, paddingTop: 16, paddingBottom: 24 }}
          noValidate
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
        >
          <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
            <legend className="field-label" style={{ marginBottom: 6, padding: 0 }}>
              I want to…
            </legend>
            <div className="role-grid" role="radiogroup" aria-invalid={error.role ? true : undefined}>
              <RoleCard role="driver" icon="car" title="I drive an EV" sub="Find and book chargers" value={v.role} onPick={(r) => f.set('role', r)} />
              <RoleCard role="owner" icon="plug" title="I own a charger" sub="Earn from your idle bay" value={v.role} onPick={(r) => f.set('role', r)} />
            </div>
            {error.role && (
              <div className="field-error" role="alert" style={{ marginTop: 6 }}>
                {error.role}
              </div>
            )}
          </fieldset>

          <TextField
            label="Full name"
            value={v.name}
            onChange={(x) => f.set('name', x)}
            onBlur={() => f.blur('name')}
            error={error.name}
            autoComplete="name"
            autoCapitalize="words"
            placeholder="Chan Tai Man"
          />
          <TextField
            label="Email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="off"
            spellCheck={false}
            value={v.email}
            onChange={(x) => f.set('email', x)}
            onBlur={() => f.blur('email')}
            error={error.email}
            placeholder="name@example.com"
          />
          <TextField
            label="Mobile number"
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            prefix="+852"
            value={v.phone}
            onChange={(x) => f.set('phone', formatPhone(phoneDigits(x)))}
            onBlur={() => f.blur('phone')}
            error={error.phone}
            placeholder="9123 4567"
            hint="We’ll text a verification code (demo: no real SMS)."
          />
          <PasswordField
            label="Password"
            checklist
            value={v.password}
            onChange={(x) => f.set('password', x)}
            onBlur={() => f.blur('password')}
            invalid={!!error.password}
            autoComplete="new-password"
          />
          <PasswordField
            label="Confirm password"
            value={v.confirm}
            onChange={(x) => f.set('confirm', x)}
            onBlur={() => f.blur('confirm')}
            error={error.confirm}
            autoComplete="new-password"
          />
          <Checkbox checked={v.terms} onChange={(x) => f.set('terms', x)} error={error.terms}>
            I agree to the Terms and Privacy Policy — demo
          </Checkbox>

          {/* Looks disabled until valid, but stays tappable so a tap reveals every error. */}
          <button type="submit" className={cx('btn btn-primary block', !f.valid && 'is-disabled')} aria-disabled={!f.valid}>
            Continue
          </button>
          <p className="caption" style={{ textAlign: 'center', fontSize: 15 }}>
            Already have an account?{' '}
            <Link to="/login" replace className="text-link">
              Log in
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}

function RoleCard({
  role,
  icon,
  title,
  sub,
  value,
  onPick,
}: {
  role: Role
  icon: IconName
  title: string
  sub: string
  value: Role | ''
  onPick: (r: Role) => void
}) {
  const selected = value === role
  return (
    <button type="button" role="radio" aria-checked={selected} className={cx('role-card', selected && 'selected')} onClick={() => onPick(role)}>
      <span className="role-icon">
        <Icon name={icon} size={26} />
      </span>
      <span className="role-title">{title}</span>
      <span className="role-sub">{sub}</span>
      {selected && (
        <span className="role-check" aria-hidden>
          <Icon name="check" size={14} stroke={3} />
        </span>
      )}
    </button>
  )
}
