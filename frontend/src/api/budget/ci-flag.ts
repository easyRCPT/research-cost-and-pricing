import { useSyncExternalStore } from 'react'

import { useBudgetId } from './context'

/**
 * Whether the chief investigator's time is costed.
 *
 * TODO: this belongs on the budget. It is kept in the browser because the
 * engine does not take the flag yet — see lib/staff.ts — so the server has
 * nowhere to put it and it is lost on reload.
 */
const included = new Map<number, boolean>()
const listeners = new Set<() => void>()

const notify = () => {
  for (const listener of listeners) listener()
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function useCiFlag() {
  const budgetId = useBudgetId()

  const value = useSyncExternalStore(
    subscribe,
    () => included.get(budgetId) ?? true,
  )

  return {
    included: value,
    setIncluded: (next: boolean) => {
      included.set(budgetId, next)
      notify()
    },
  }
}
