// Form state with the project's validation timing:
//   • a field is validated on blur and on submit,
//   • after it has shown an error once, it re-validates live on every change
//     (including changes to other fields it depends on, e.g. confirm ↔ password).

import { useState } from 'react'

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

  const blur = (k: keyof V) => {
    const err = check(k, values)
    setShown((s) => ({ ...s, [k]: err }))
    if (err) setLive((l) => ({ ...l, [k]: true }))
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
