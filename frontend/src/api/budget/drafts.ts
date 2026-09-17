import { useSyncExternalStore } from 'react'

import type { NonStaffLine, StaffLine } from '@/types'
import { useBudgetId } from './context'

/**
 * Rows being filled in, which the server cannot hold yet.
 *
 * The grid works by offering blank rows and letting one be completed a column
 * at a time. A staff line has no meaning to the engine until it names an
 * employment type, category, classification and time basis, and the model
 * refuses to store one without them — so a row lives here until it is complete
 * enough to save, and moves to the server the moment it is.
 */
export interface Drafts {
  staff: StaffLine[]
  non_staff: NonStaffLine[]
}

const EMPTY: Drafts = { staff: [], non_staff: [] }

const byBudget = new Map<number, Drafts>()
const listeners = new Set<() => void>()

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

const notify = () => {
  for (const listener of listeners) listener()
}

export const getDrafts = (budgetId: number) => byBudget.get(budgetId) ?? EMPTY

export function setDrafts(budgetId: number, next: Drafts) {
  byBudget.set(budgetId, next)
  notify()
}

export function useDrafts(): Drafts {
  const budgetId = useBudgetId()
  return useSyncExternalStore(subscribe, () => getDrafts(budgetId))
}

/** Draft rows carry negative ids so a saved row is never mistaken for one. */
export const isDraft = (id: number) => id < 0
