// TODO: temporary. Point these hooks back at /api/budgets/{id}/ when auth lands.

// The budget lives in the browser (lib/budget-store/). Every edit patches it;
// an edit that moves a priced field also re-POSTs the whole thing to /api/calculate/.
import {
  useIsMutating,
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query'

import { api, ApiError } from '@/lib/api'
import { toast } from 'sonner'
import {
  type BudgetInput,
  getBudgetInput,
  seedMultipliers,
  toCalculateRequest,
} from '@/lib/budget-store'
import type { BudgetDetail } from '@/types'
import { useLookups } from '@/api/lookups'

export const budgetKey = ['budget'] as const
const calculateKey = ['calculate'] as const

/** Replies can land out of order, only newest request writes cache */
let latestRequest = 0

async function calculate(input: BudgetInput): Promise<BudgetDetail> {
  const { data, error, response } = await api.POST('/api/calculate/', {
    body: toCalculateRequest(input),
  })
  if (error) throw new ApiError(response.status, error)
  return data
}

export function useBudget() {
  // Lookups are cached forever, so this is free after the first screen.
  const { data: lookups } = useLookups()
  seedMultipliers(lookups.calculation_constants)

  return useSuspenseQuery({
    queryKey: budgetKey,
    queryFn: () => calculate(getBudgetInput()),
  })
}

const errorDescription = (error: ApiError) => {
  const fields = Object.entries(error.fields)
  if (fields.length === 0) return error.message
  return fields.map(([field, message]) => `${field}: ${message}`).join('\n')
}

/** Prices the budget the store already holds. */
export function useRecalculate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: calculateKey,
    mutationFn: async (input: BudgetInput) => {
      const request = ++latestRequest
      return { budget: await calculate(input), request }
    },
    onSuccess: ({ budget, request }) => {
      if (request === latestRequest) queryClient.setQueryData(budgetKey, budget)
    },
    // A rejected edit leaves the store holding what was typed while the cache
    // keeps the last good budget, which looks like nothing happened. Say so.
    onError: (error) => {
      if (error instanceof ApiError) {
        toast.error('Some of your changes were not applied', {
          id: 'calculate',
          description: errorDescription(error),
        })
        return
      }
      toast.error('Could not reach the calculator', {
        id: 'calculate',
        description: 'Please try again',
      })
    },
  })
}

/** True while any edit is waiting on the engine */
export const useCalculating = () =>
  useIsMutating({ mutationKey: calculateKey }) > 0
