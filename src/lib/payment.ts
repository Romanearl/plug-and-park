// Card checks and a mock payment gateway (pure, no imports).
// HARD RULE: card number, expiry and CVC are never stored — only the last 4 digits.

export const digitsOnly = (s: string) => s.replace(/\D/g, '')

export function luhn(number: string): boolean {
  const d = digitsOnly(number)
  if (!d) return false
  let sum = 0
  for (let i = 0; i < d.length; i++) {
    let n = +d[d.length - 1 - i]
    if (i % 2 === 1) {
      n *= 2
      if (n > 9) n -= 9
    }
    sum += n
  }
  return sum % 10 === 0
}

export type CardBrand = 'visa' | 'mastercard' | 'unknown'

export function cardBrand(number: string): CardBrand {
  const d = digitsOnly(number)
  if (/^4/.test(d)) return 'visa'
  const two = +d.slice(0, 2)
  const four = +d.slice(0, 4)
  if ((two >= 51 && two <= 55) || (four >= 2221 && four <= 2720)) return 'mastercard'
  return 'unknown'
}

/** "4242424242424242" → "4242 4242 4242 4242" (max 19 digits). */
export function formatCardNumber(value: string): string {
  return digitsOnly(value).slice(0, 19).replace(/(\d{4})(?=\d)/g, '$1 ')
}

/** "1228" → "12/28"; typing "1" stays "1", "12" → "12/" is left to the user. */
export function formatExpiry(value: string): string {
  const d = digitsOnly(value).slice(0, 4)
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d
}

export function validateCardNumber(value: string): string | null {
  const d = digitsOnly(value)
  return d.length >= 13 && d.length <= 19 && luhn(d) ? null : 'Enter a valid card number'
}

export function validateExpiry(value: string, now: Date = new Date()): string | null {
  const m = /^(\d{2})\/(\d{2})$/.exec(value.trim())
  if (!m) return 'Enter a valid expiry date'
  const month = +m[1]
  const year = 2000 + +m[2]
  if (month < 1 || month > 12) return 'Enter a valid expiry date'
  // Valid through the last day of the expiry month.
  const endOfMonth = new Date(year, month, 1)
  return endOfMonth.getTime() <= now.getTime() ? 'This card has expired' : null
}

export function validateCvc(value: string): string | null {
  return /^\d{3}$/.test(value.trim()) ? null : 'Enter the 3-digit security code'
}

export function validateCardName(value: string): string | null {
  return value.trim().length >= 2 ? null : 'Enter the name on the card'
}

export const DECLINE_CARD = '4000000000000002'
export const GATEWAY_MS = 1500

export type GatewayResult = { ok: true } | { ok: false; reason: string }

/** Pretend payment gateway: ~1.5 s, declines the documented test card. */
export function mockGateway(cardNumber: string, ms = GATEWAY_MS): Promise<GatewayResult> {
  const d = digitsOnly(cardNumber)
  return new Promise((resolve) =>
    setTimeout(
      () => resolve(d === DECLINE_CARD ? { ok: false, reason: 'Your card was declined. Try another card.' } : { ok: true }),
      ms,
    ),
  )
}

/** Expiry two years ahead, for the "Use test card" button. */
export function testExpiry(now: Date = new Date()): string {
  return `${String(now.getMonth() + 1).padStart(2, '0')}/${String((now.getFullYear() + 2) % 100).padStart(2, '0')}`
}
