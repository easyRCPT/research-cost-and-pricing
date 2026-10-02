import { createContext, use } from 'react'

/**
 * Which budget the costing screens are editing.
 *
 * Held in context rather than threaded through props so the screens and their
 * hooks read the same one without every component taking an id it does not use.
 * The provider lives next door in BudgetProvider.tsx, so that this module
 * exports only hooks and fast refresh keeps working.
 */
export const BudgetIdContext = createContext<number | null>(null)

export function useBudgetId(): number {
  const budgetId = use(BudgetIdContext)
  if (budgetId === null)
    throw new Error('Costing screens must be inside a BudgetProvider.')
  return budgetId
}
