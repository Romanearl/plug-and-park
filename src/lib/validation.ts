// Form validation as pure functions. Each validator returns an error string, or null when valid.

import type { User } from '../data/types'

export type Validator<T = string> = (value: T) => string | null

// ── Name ────────────────────────────────────────────────────────────────

/** Letters from any script (incl. Chinese), spaces, hyphens and apostrophes. */
const NAME_RE = /^[\p{L}\p{M}][\p{L}\p{M}\s'’-]*$/u

export function validateName(value: string): string | null {
  const v = value.trim().replace(/\s+/g, ' ')
  if (v.length < 2 || v.length > 40 || !NAME_RE.test(v)) return 'Enter your full name'
  return null
}

// ── Email ───────────────────────────────────────────────────────────────

export const normalizeEmail = (value: string) => value.trim().toLowerCase()

const EMAIL_RE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[a-z]{2,}$/

export function validateEmail(value: string): string | null {
  return EMAIL_RE.test(normalizeEmail(value)) ? null : 'Enter a valid email, e.g. name@example.com'
}

export function emailExists(value: string, users: User[]): boolean {
  const email = normalizeEmail(value)
  return users.some((u) => u.email === email)
}

/** Registration: a valid email that isn't already taken. */
export function validateNewEmail(value: string, users: User[]): string | null {
  return (
    validateEmail(value) ??
    (emailExists(value, users) ? 'An account with this email already exists — log in instead' : null)
  )
}

// ── Hong Kong mobile ────────────────────────────────────────────────────

/** Keep only digits, max 8 (the +852 prefix is a fixed adornment). */
export const phoneDigits = (value: string) => value.replace(/\D/g, '').slice(0, 8)

/** "91234567" → "9123 4567" (works on partial input too). */
export function formatPhone(value: string): string {
  const d = phoneDigits(value)
  return d.length > 4 ? `${d.slice(0, 4)} ${d.slice(4)}` : d
}

export function validatePhone(value: string): string | null {
  return /^[4-9]\d{7}$/.test(phoneDigits(value)) && value.replace(/[\s\d]/g, '') === ''
    ? null
    : 'Enter an 8-digit Hong Kong mobile number'
}

/** "+852 9123 4567" → "+852 •••• 4567". */
export function maskPhone(phone: string | undefined): string | null {
  if (!phone) return null
  const d = phone.replace(/\D/g, '').slice(-8)
  return d.length === 8 ? `+852 •••• ${d.slice(4)}` : null
}

// ── Password ────────────────────────────────────────────────────────────

export interface PasswordRule {
  id: 'length' | 'upper' | 'lower' | 'number'
  label: string
  ok: boolean
}

export function passwordRules(value: string): PasswordRule[] {
  return [
    { id: 'length', label: 'At least 8 characters', ok: value.length >= 8 },
    { id: 'upper', label: 'One uppercase letter', ok: /[A-Z]/.test(value) },
    { id: 'lower', label: 'One lowercase letter', ok: /[a-z]/.test(value) },
    { id: 'number', label: 'One number', ok: /\d/.test(value) },
  ]
}

/** The UI shows the live rule checklist instead of this text; it marks the field invalid. */
export function validatePassword(value: string): string | null {
  return passwordRules(value).every((r) => r.ok) ? null : 'Password doesn’t meet all the rules yet'
}

export function validateConfirm(password: string, confirm: string): string | null {
  return confirm.length > 0 && confirm === password ? null : 'Passwords don’t match'
}

export function validateTerms(accepted: boolean): string | null {
  return accepted ? null : 'Please accept the terms to continue'
}

// ── OTP ─────────────────────────────────────────────────────────────────

export const OTP_LENGTH = 6
export const OTP_MAX_ATTEMPTS = 5
export const OTP_RESEND_SECONDS = 30
