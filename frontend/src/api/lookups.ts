import { queryOptions, useSuspenseQuery } from '@tanstack/react-query'

import { useBudgetId } from '@/api/budget/context'
import { api, unwrap } from '@/lib/api'

export const lookupsQuery = queryOptions({
  queryKey: ['lookups'] as const,
  queryFn: async () => {
    return unwrap(await api.GET('/api/lookups/'))
  },
  staleTime: Infinity,
})

export function useLookups() {
  return useSuspenseQuery(lookupsQuery)
}

/**
 * The tables one costing is priced on (#198): the version stamped when it was
 * submitted, or today's for a draft. For its Lookups tab, which has to agree
 * with its figures; the editor's choices read today's through `useLookups`.
 */
export const costingLookupsQuery = (budgetId: number) =>
  queryOptions({
    queryKey: ['lookups', 'costing', budgetId] as const,
    queryFn: async () =>
      unwrap(
        await api.GET('/api/lookups/', {
          params: { query: { budget: budgetId } },
        }),
      ),
    // Read afresh each visit: a draft's tables follow today's rates, and
    // submitting fixes them to that day's version.
  })

export function useCostingLookups() {
  return useSuspenseQuery(costingLookupsQuery(useBudgetId()))
}
