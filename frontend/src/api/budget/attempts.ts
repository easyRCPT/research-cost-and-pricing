import { useMutation } from '@tanstack/react-query'

import { projectKeys } from '@/api/projects'
import { useInvalidate } from '@/api/query'
import { api, unwrap } from '@/lib/api'

import { useBudgetId } from './context'
import { budgetKeys } from './detail'

/**
 * Pull this costing back out of review (#95). It becomes `withdrawn`: kept,
 * read-only, as the record of what was submitted. The way on is a new draft.
 */
export function useWithdrawBudget() {
  const budgetId = useBudgetId()
  const invalidate = useInvalidate()

  return useMutation({
    mutationFn: async () => {
      unwrap(
        await api.POST('/api/budgets/{budget_id}/withdraw/', {
          params: { path: { budget_id: budgetId } },
        }),
      )
    },
    // Refetched on a refusal too: a 409 means an approver decided first, and
    // the screen should show where it went rather than an error.
    onSettled: () => {
      invalidate(budgetKeys.detail(budgetId), projectKeys.all)
    },
  })
}

/**
 * Carry on from a rejected or withdrawn attempt (#81, #95): a new draft on the
 * same project, priced on today's rates, with the old attempt left as it was.
 *
 * The project opens its newest costing, so once the project list is fetched
 * again the screens are on the new draft.
 */
export function useNewDraftFrom() {
  const budgetId = useBudgetId()
  const invalidate = useInvalidate()

  return useMutation({
    mutationFn: async () => {
      unwrap(
        await api.POST('/api/budgets/{budget_id}/clone/', {
          params: { path: { budget_id: budgetId } },
        }),
      )
    },
    onSuccess: () => invalidate(projectKeys.all),
  })
}
