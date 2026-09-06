import {
  queryOptions,
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query'
import { api, ApiError } from '@/lib/api'
import type { BudgetDetail, StaffLineInput } from '@/types'

export const budgetKey = (budgetId: number) => ['budget', budgetId] as const

export const budgetQuery = (budgetId: number) =>
  queryOptions({
    queryKey: budgetKey(budgetId),
    queryFn: async (): Promise<BudgetDetail> => {
      const { data, error, response } = await api.GET(
        '/api/budgets/{budget_id}/',
        { params: { path: { budget_id: budgetId } } },
      )
      if (error) throw new ApiError(response.status, error)
      return data
    },
  })

export function useBudget(budgetId: number) {
  return useSuspenseQuery(budgetQuery(budgetId))
}

function useBudgetMutation<TVariables>(
  budgetId: number,
  send: (variables: TVariables) => Promise<BudgetDetail | undefined>,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: send,
    onSuccess: (budget) => {
      if (budget) {
        queryClient.setQueryData(budgetKey(budgetId), budget)
        return
      }
      return queryClient.invalidateQueries({ queryKey: budgetKey(budgetId) })
    },
  })
}

export function useAddStaffLine(budgetId: number) {
  return useBudgetMutation(budgetId, async (line: StaffLineInput) => {
    const { data, error, response } = await api.POST(
      '/api/budgets/{budget_id}/staff-lines/',
      { params: { path: { budget_id: budgetId } }, body: line },
    )
    if (error) throw new ApiError(response.status, error)
    return data
  })
}

export function useRemoveStaffLine(budgetId: number) {
  return useBudgetMutation(budgetId, async (lineId: number) => {
    const { data, error, response } = await api.DELETE(
      '/api/budgets/{budget_id}/staff-lines/{line_id}/',
      { params: { path: { budget_id: budgetId, line_id: lineId } } },
    )
    if (error) throw new ApiError(response.status, error)
    return data
  })
}

interface StaffFieldUpdate {
  row_id: number
  field: string
  value: unknown
  year?: number
}

export function useUpdateStaffField(budgetId: number) {
  return useBudgetMutation(budgetId, async (update: StaffFieldUpdate) => {
    const { data, error, response } = await api.PATCH(
      '/api/budgets/{budget_id}/',
      {
        params: { path: { budget_id: budgetId } },
        body: { section: 'staff', ...update } as never,
      },
    )
    if (error) throw new ApiError(response.status, error)
    return data as BudgetDetail | undefined
  })
}
