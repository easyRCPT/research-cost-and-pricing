import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api, ApiError } from '@/lib/api'
import { projectsQuery } from '@/api/projects'
import { useBudgetId } from './context'
import { budgetKey } from './detail'

/**
 * Pull this costing back out of review (#95). It becomes `withdrawn`: kept,
 * read-only, as the record of what was submitted. The way on is a new draft.
 */
export function useWithdrawBudget() {
  const budgetId = useBudgetId()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const { error, response } = await api.POST('/api/budgets/{budget_id}/withdraw/', {
        params: { path: { budget_id: budgetId } },
      })
      if (!response.ok) throw new ApiError(response.status, error)
    },
    // Refetched on a refusal too: a 409 means an approver decided first, and
    // the screen should show where it went rather than an error.
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: budgetKey(budgetId) })
      queryClient.invalidateQueries({ queryKey: projectsQuery.queryKey })
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
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const { error, response } = await api.POST('/api/budgets/{budget_id}/clone/', {
        params: { path: { budget_id: budgetId } },
      })
      if (!response.ok) throw new ApiError(response.status, error)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: projectsQuery.queryKey }),
  })
}
