import { useSuspenseQuery } from '@tanstack/react-query'

import { api, unwrap } from '@/lib/api'
import type { BudgetDetail } from '@/types'

import { useBudgetId } from './context'

export const budgetKeys = {
  all: ['budget'] as const,
  detail: (budgetId: number) => ['budget', budgetId] as const,
}

async function fetchBudget(budgetId: number): Promise<BudgetDetail> {
  return unwrap(
    await api.GET('/api/budgets/{budget_id}/', {
      params: { path: { budget_id: budgetId } },
    }),
  )
}

/** The saved budget, priced. The server is the source of truth for all of it. */
export function useBudget() {
  const budgetId = useBudgetId()

  return useSuspenseQuery({
    queryKey: budgetKeys.detail(budgetId),
    queryFn: () => fetchBudget(budgetId),
  })
}
