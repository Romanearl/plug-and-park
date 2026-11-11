// Small helpers shared across the app.

/** Short random id with a readable prefix, e.g. id('bk') → "bk_4f9k2a". */
export function id(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}`
}

/**
 * NOT real security. A deterministic scramble so the demo never stores a
 * plain-text password in localStorage. Real auth is out of scope.
 */
export function fakeHash(password: string): string {
  let h = 5381
  for (let i = 0; i < password.length; i++) h = ((h << 5) + h + password.charCodeAt(i)) >>> 0
  return `demo$${h.toString(16)}`
}

export const hkd = (n: number) =>
  `HK$${n.toLocaleString('en-HK', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`

export function addMinutes(iso: string, minutes: number): string {
  return new Date(new Date(iso).getTime() + minutes * 60_000).toISOString()
}

/** ISO string for `days` from today at HH:MM local time. */
export function dayAt(days: number, hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number)
  const d = new Date()
  d.setDate(d.getDate() + days)
  d.setHours(h, m, 0, 0)
  return d.toISOString()
}

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ')
}
