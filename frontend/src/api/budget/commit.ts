import { useQueryClient } from '@tanstack/react-query'

import {
  type BudgetInput,
  changesPrice,
  getBudgetInput,
  savePatch,
} from '@/lib/budget-store'
import type { BudgetDetail } from '@/types'
import { budgetKey, useRecalculate } from './calculate'

/** The edit, echoed onto the cached budget. These two are read from it. */
const echo = (budget: BudgetDetail, input: BudgetInput): BudgetDetail => ({
  ...budget,
  project_info: { ...budget.project_info, ...input.project_info },
  budget_info: {
    ...budget.budget_info,
    ...input.budget_info,
    // Nothing edits deliverables yet, and the response types them more
    // strictly than the request does.
    deliverables: budget.budget_info.deliverables,
  },
})

/**
 * Every edit patches the store and shows immediately. Calculating is the extra
 * step, taken only when the change moved something the engine reads.
 */
export function useCommit() {
  const queryClient = useQueryClient()
  const recalculate = useRecalculate()

  return (change: (budget: BudgetInput) => BudgetInput) => {
    const before = getBudgetInput()
    const after = savePatch(change)
    queryClient.setQueryData(
      budgetKey,
      (budget: BudgetDetail | undefined) => budget && echo(budget, after),
    )
    if (changesPrice(before, after)) recalculate.mutate(after)
  }
}
