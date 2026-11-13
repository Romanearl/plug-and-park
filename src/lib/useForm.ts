// Form state with the project's validation timing:
//   • a field is validated on blur and on submit,
//   • after it has shown an error once, it re-validates live on every change
//     (including changes to other fields it depends on, e.g. confirm ↔ password).

import { useRef, useState } from 'react'

// A field usually loses focus because the user pressed something else. Showing its error right then
// moves everything below it by a line while the finger (or mouse button) is still down, so the press
// ends on a different element and the tap is lost ("Use test card" did nothing). So when a blur
// happens during a press, the error is shown once that tap has finished.
let pressing = false
if (typeof window !== 'undefined') {
  const up = () => window.setTimeout(() => (pressing = false), 0)
  window.addEventListener('pointerdown', () => (pressing = true), true)
  window.addEventListener('pointerup', up, true)
  window.addEventListener('pointercancel', up, true)
}
const TAP_GRACE_MS = 400 // long enough for the click that follows a press; a held press shows the error anyway

function afterTap(run: () => void) {
  if (!pressing) return run()
  let done = false
  const finish = () => {
    if (done) return
    done = true
    window.removeEventListener('click', onClick, true)
    window.clearTimeout(timer)
    run()
  }
  // The click's own handlers run first (e.g. "fill demo account" clears the errors), then this.
  const onClick = () => window.setTimeout(finish, 0)
  const timer = window.setTimeout(finish, TAP_GRACE_MS)
  window.addEventListener('click', onClick, true)
}

export type Validators<V> = { [K in keyof V]: (value: V[K], all: V) => string | null }
type Errors<V> = Partial<Record<keyof V, string | null>>

export function useForm<V extends Record<string, unknown>>(initial: V, validators: Validators<V>) {
  const [values, setValues] = useState<V>(initial)
  const [shown, setShown] = useState<Errors<V>>({})
  const [live, setLive] = useState<Partial<Record<keyof V, boolean>>>({})

  const keys = Object.keys(validators) as (keyof V)[]
  const check = (k: keyof V, all: V) => validators[k](all[k], all)
  const valid = keys.every((k) => !check(k, values))

  const set = <K extends keyof V>(k: K, value: V[K]) => {
    const next = { ...values, [k]: value }
    setValues(next)
    setShown((s) => {
      const upd = { ...s }
      for (const key of keys) if (live[key]) upd[key] = check(key, next)
      return upd
    })
  }

  // The newest values, for a blur check that runs a moment later (see afterTap).
  const latest = useRef(values)
  latest.current = values

  const blur = (k: keyof V) => {
    afterTap(() => {
      const err = check(k, latest.current) // the tap may have just filled the form
      setShown((s) => ({ ...s, [k]: err }))
      if (err) setLive((l) => ({ ...l, [k]: true }))
    })
  }

  /** Show every error. Returns true when the form is valid. */
  const submitAll = () => {
    const all: Errors<V> = {}
    const lv = { ...live }
    for (const k of keys) {
      all[k] = check(k, values)
      if (all[k]) lv[k] = true
    }
    setShown(all)
    setLive(lv)
    return keys.every((k) => !all[k])
  }

  /** Replace several values at once (e.g. "fill demo account") and clear shown errors. */
  const fill = (patch: Partial<V>) => {
    setValues((prev) => ({ ...prev, ...patch }))
    setShown({})
    setLive({})
  }

  return { values, set, blur, submitAll, fill, error: shown, valid }
}
