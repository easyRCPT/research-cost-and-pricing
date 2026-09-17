import { useSuspenseQuery } from '@tanstack/react-query'

import { api, ApiError } from '@/lib/api'
import type { BudgetDetail } from '@/types'
import { useBudgetId } from './context'

export const budgetKey = (budgetId: number) => ['budget', budgetId] as const

export async function fetchBudget(budgetId: number): Promise<BudgetDetail> {
  const { data, error, response } = await api.GET('/api/budgets/{budget_id}/', {
    params: { path: { budget_id: budgetId } },
  })
  if (error) throw new ApiError(response.status, error)
  return data
}

/** The saved budget, priced. The server is the source of truth for all of it. */
export function useBudget() {
  const budgetId = useBudgetId()

  return useSuspenseQuery({
    queryKey: budgetKey(budgetId),
    queryFn: () => fetchBudget(budgetId),
  })
}
