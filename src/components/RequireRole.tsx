import { useEffect, type ReactNode } from 'react'
import type { Role } from '../data/types'
import { navigate } from '../lib/router'
import { useCurrentUser } from '../lib/store'

export const homeFor = (role: Role) => (role === 'owner' ? '/owner' : '/app')

/** Route guard: not signed in → #/login; signed in with the other role → that role's home. */
export function RequireRole({ role, children }: { role: Role; children: ReactNode }) {
  const user = useCurrentUser()
  const target = !user ? '/login' : user.role !== role ? homeFor(user.role) : null

  useEffect(() => {
    if (target) navigate(target, { replace: true })
  }, [target])

  return target ? null : <>{children}</>
}
