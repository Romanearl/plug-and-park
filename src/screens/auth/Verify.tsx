import { useEffect, useRef, useState, type ClipboardEvent, type KeyboardEvent } from 'react'
import { AuthHeader } from '../../components/Field'
import { Icon } from '../../components/Icon'
import { DEMO_OTP } from '../../data/seed'
import { completeVerification, getPending, isCorrectOtp, pendingPhone, pendingRole } from '../../lib/auth'
import { back, navigate } from '../../lib/router'
import { cx } from '../../lib/util'
import { maskPhone, OTP_LENGTH, OTP_MAX_ATTEMPTS, OTP_RESEND_SECONDS } from '../../lib/validation'

const empty = () => Array<string>(OTP_LENGTH).fill('')

export function Verify() {
  const [pending] = useState(getPending)

  // No login or registration in progress → nothing to verify.
  useEffect(() => {
    if (!pending) navigate('/', { replace: true })
  }, [pending])

  const [digits, setDigits] = useState<string[]>(empty)
  const [attempts, setAttempts] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [shake, setShake] = useState(0)
  const [seconds, setSeconds] = useState(OTP_RESEND_SECONDS)
  const [success, setSuccess] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const boxes = useRef<(HTMLInputElement | null)[]>([])

  const locked = attempts >= OTP_MAX_ATTEMPTS
  const code = digits.join('')

  // Resend countdown.
  useEffect(() => {
    if (seconds <= 0) return
    const t = window.setTimeout(() => setSeconds((s) => s - 1), 1000)
    return () => window.clearTimeout(t)
  }, [seconds])

  // Toast auto-hide.
  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(null), 2600)
    return () => window.clearTimeout(t)
  }, [toast])

  // Auto-submit when the 6th digit is entered.
  useEffect(() => {
    if (!pending || success || locked || code.length !== OTP_LENGTH) return
    if (isCorrectOtp(code)) {
      setError(null)
      setSuccess(true)
      boxes.current.forEach((b) => b?.blur())
      window.getSelection()?.removeAllRanges()
      const role = pendingRole(pending)
      const t = window.setTimeout(() => {
        completeVerification(pending)
        navigate(role === 'owner' ? '/owner' : '/app', { replace: true })
      }, 1100)
      return () => window.clearTimeout(t)
    }
    const n = attempts + 1
    setAttempts(n)
    setError(n >= OTP_MAX_ATTEMPTS ? 'Too many attempts — request a new code' : 'That code isn’t right. Try again.')
    setShake((s) => s + 1)
    setDigits(empty())
    if (n < OTP_MAX_ATTEMPTS) boxes.current[0]?.focus()
  }, [code]) // only re-run when the code itself changes

  if (!pending) return null

  const focus = (i: number) => {
    const el = boxes.current[Math.max(0, Math.min(OTP_LENGTH - 1, i))]
    el?.focus()
    el?.select()
  }

  /** Put `chars` into the boxes starting at `from`. */
  const fillFrom = (from: number, chars: string) => {
    const next = [...digits]
    let i = from
    for (const c of chars) {
      if (i >= OTP_LENGTH) break
      next[i++] = c
    }
    setDigits(next)
    focus(i >= OTP_LENGTH ? OTP_LENGTH - 1 : i)
  }

  const onChange = (i: number, raw: string) => {
    if (error && !locked) setError(null)
    const d = raw.replace(/\D/g, '')
    if (d.length > 1) {
      // Autofill or paste into one box: a full code always starts at the first box.
      fillFrom(d.length >= OTP_LENGTH ? 0 : i, d.slice(0, OTP_LENGTH))
      return
    }
    const next = [...digits]
    next[i] = d
    setDigits(next)
    if (d) focus(i + 1)
  }

  const onKeyDown = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      e.preventDefault()
      const next = [...digits]
      next[i - 1] = ''
      setDigits(next)
      focus(i - 1)
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      focus(i - 1)
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      focus(i + 1)
    }
  }

  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const d = e.clipboardData.getData('text').replace(/\D/g, '')
    if (!d) return
    e.preventDefault()
    if (error && !locked) setError(null)
    fillFrom(0, d.slice(0, OTP_LENGTH))
  }

  const resend = () => {
    setSeconds(OTP_RESEND_SECONDS)
    setAttempts(0)
    setError(null)
    setDigits(empty())
    setToast(`New code sent (demo: ${DEMO_OTP})`)
    window.setTimeout(() => focus(0), 0)
  }

  const masked = maskPhone(pendingPhone(pending))
  const mm = Math.floor(seconds / 60)
  const ss = String(seconds % 60).padStart(2, '0')

  return (
    <div className="screen-view">
      <div className="scroll">
        <AuthHeader
          title="Enter the 6-digit code"
          sub={masked ? `Sent to ${masked}` : 'Sent to your registered mobile number'}
          onBack={() => back(pending.kind === 'register' ? '/register' : '/login')}
        />
        <div className="page rise-2" style={{ paddingTop: 16, paddingBottom: 24 }}>
          <span className="badge blue" style={{ height: 30, padding: '0 12px', fontSize: 13 }}>
            <Icon name="info" size={16} /> Demo code: {DEMO_OTP}
          </span>

          {/* Two identical keyframes, alternated, restart the shake without remounting (keeps focus). */}
          <div className={cx('otp', shake > 0 && (shake % 2 ? 'shake-a' : 'shake-b'))} role="group" aria-label="Verification code">
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => {
                  boxes.current[i] = el
                }}
                className={cx('otp-box', d && 'filled', error && 'invalid', success && 'ok')}
                value={d}
                onChange={(e) => onChange(i, e.target.value)}
                onKeyDown={(e) => onKeyDown(i, e)}
                onPaste={onPaste}
                onFocus={(e) => e.target.select()}
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete={i === 0 ? 'one-time-code' : 'off'}
                maxLength={i === 0 ? OTP_LENGTH : 1}
                autoFocus={i === 0}
                disabled={locked || success}
                aria-label={`Digit ${i + 1} of ${OTP_LENGTH}`}
                aria-invalid={error ? true : undefined}
              />
            ))}
          </div>

          <div className="field-error" role="alert" style={{ minHeight: 20, marginTop: 10 }}>
            {error}
          </div>

          <div style={{ marginTop: 18 }}>
            {seconds > 0 && !locked ? (
              <span className="caption" style={{ fontSize: 15 }}>
                Resend code in{' '}
                <span className="mono">
                  {mm}:{ss}
                </span>
              </span>
            ) : (
              <button type="button" className="text-link" onClick={resend}>
                Resend code
              </button>
            )}
          </div>
        </div>
      </div>

      {success && (
        <div className="verify-success" role="status">
          <span className="success-tick">
            <Icon name="check" size={40} stroke={3} />
          </span>
          <div className="h2" style={{ marginTop: 18 }}>
            Verified
          </div>
          <div className="muted" style={{ marginTop: 4 }}>
            Signing you in…
          </div>
        </div>
      )}

      {toast && (
        <div className="toast" role="status">
          <Icon name="check" size={18} stroke={2.5} /> {toast}
        </div>
      )}
    </div>
  )
}
