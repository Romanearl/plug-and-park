// One-shot message carried across a navigation (e.g. "Your charger is live" on My spots).
let pending: string | null = null
export const setFlash = (msg: string) => {
  pending = msg
}
export const takeFlash = () => {
  const m = pending
  pending = null
  return m
}
