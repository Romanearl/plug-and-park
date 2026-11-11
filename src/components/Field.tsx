// Form building blocks: text field, password field with live rule checklist, checkbox.

import { useId, useState, type InputHTMLAttributes, type ReactNode } from 'react'
import { cx } from '../lib/util'
import { passwordRules } from '../lib/validation'
import { Icon } from './Icon'

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'prefix'>

export function TextField({
  label,
  value,
  onChange,
  error,
  invalid,
  hint,
  prefix,
  suffix,
  ...input
}: InputProps & {
  label: string
  value: string
  onChange: (v: string) => void
  error?: string | null
  /** Red border without a message. */
  invalid?: boolean
  hint?: ReactNode
  /** Fixed adornment inside the input, e.g. "+852". */
  prefix?: string
  /** Trailing control inside the input, e.g. a show/hide button. */
  suffix?: ReactNode
}) {
  const id = useId()
  const errId = `${id}-err`
  const hintId = `${id}-hint`
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className={cx('input-wrap', !!prefix && 'has-prefix', !!suffix && 'has-suffix')}>
        {prefix && (
          <span className="input-prefix" aria-hidden>
            {prefix}
          </span>
        )}
        <input
          id={id}
          className={cx('input', (error || invalid) && 'invalid')}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={error || invalid ? true : undefined}
          aria-describedby={error ? errId : hint ? hintId : undefined}
          {...input}
        />
        {suffix && <span className="input-suffix">{suffix}</span>}
      </div>
      {error ? (
        <div className="field-error" id={errId} role="alert">
          {error}
        </div>
      ) : (
        hint && (
          <div className="field-hint" id={hintId}>
            {hint}
          </div>
        )
      )}
    </div>
  )
}

export function PasswordField({
  checklist,
  invalid,
  error,
  ...props
}: Omit<Parameters<typeof TextField>[0], 'type' | 'suffix' | 'error'> & {
  /** Show the live rule checklist (register) instead of an error message. */
  checklist?: boolean
  /** Mark the field red without a message (the checklist explains why). */
  invalid?: boolean
  error?: string | null
}) {
  const [visible, setVisible] = useState(false)
  const rules = passwordRules(props.value)
  return (
    <div className="stack" style={{ gap: 8 }}>
      <TextField
        {...props}
        type={visible ? 'text' : 'password'}
        error={checklist ? null : error}
        invalid={checklist ? invalid : undefined}
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        suffix={
          <button
            type="button"
            className="input-toggle"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? 'Hide password' : 'Show password'}
            aria-pressed={visible}
          >
            {visible ? 'Hide' : 'Show'}
          </button>
        }
      />
      {checklist && (
        <ul className="pw-rules" aria-label="Password rules">
          {rules.map((r) => (
            <li key={r.id} className={cx(r.ok && 'ok', !r.ok && invalid && 'bad')}>
              <span className="pw-dot" aria-hidden>
                {r.ok ? <Icon name="check" size={12} stroke={3} /> : null}
              </span>
              {r.label}
              <span className="sr-only">{r.ok ? ' — done' : ' — not yet'}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function Checkbox({
  checked,
  onChange,
  children,
  error,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  children: ReactNode
  error?: string | null
}) {
  const id = useId()
  return (
    <div className="field">
      <label className={cx('checkbox', error && 'invalid')} htmlFor={id}>
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-err` : undefined}
        />
        <span className="box" aria-hidden>
          {checked && <Icon name="check" size={16} stroke={3} />}
        </span>
        <span>{children}</span>
      </label>
      {error && (
        <div className="field-error" id={`${id}-err`} role="alert">
          {error}
        </div>
      )}
    </div>
  )
}

/** Header used by the auth screens: back button + title + optional sub-line. */
export function AuthHeader({ title, sub, onBack }: { title: string; sub?: ReactNode; onBack: () => void }) {
  return (
    <>
      <div className="topbar">
        <button className="icon-btn" onClick={onBack} aria-label="Back">
          <Icon name="back" />
        </button>
      </div>
      <div className="page rise" style={{ paddingBottom: 4 }}>
        <h1 className="h1">{title}</h1>
        {sub && <p className="muted" style={{ marginTop: 8 }}>{sub}</p>}
      </div>
    </>
  )
}
