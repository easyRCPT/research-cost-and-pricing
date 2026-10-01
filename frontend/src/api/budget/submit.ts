import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api, unwrap } from '@/lib/api'
import { projectsQuery } from '@/api/projects'
import { useBudgetId } from './context'
import { budgetKey } from './detail'

/**
 * The server said the budget is not ready, and listed why.
 *
 * Its own class because the 422 from submit carries `reasons`, a plain list,
 * rather than the field-by-field envelope every other refusal uses.
 */
export class NotReady extends Error {
  reasons: string[]

  constructor(reasons: string[]) {
    super('This costing is not ready to submit.')
    this.name = 'NotReady'
    this.reasons = reasons
  }
}

/**
 * Send the budget for review.
 *
 * The server owns what happens next -- the steps it creates, whether a dean is
 * needed, the status it lands in -- so on success the budget is refetched and
 * the screen renders what came back, rather than what the browser assumed.
 */
export function useSubmitBudget() {
  const budgetId = useBudgetId()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const result = await api.POST('/api/budgets/{budget_id}/submit/', {
        params: { path: { budget_id: budgetId } },
      })
      if (result.response.status === 422) {
        const body = result.error as { reasons?: string[] } | undefined
        throw new NotReady(body?.reasons ?? [])
      }
      unwrap(result)
    },
    onSettled: () => {
      // Refetched on a refusal too: a 409 means another tab already
      // submitted, and the screen should show that rather than an error.
      queryClient.invalidateQueries({ queryKey: budgetKey(budgetId) })
      queryClient.invalidateQueries({ queryKey: projectsQuery.queryKey })
    },
  })
}
