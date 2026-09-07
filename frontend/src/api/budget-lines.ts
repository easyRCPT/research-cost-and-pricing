// TODO: temporary. Point these hooks back at /api/budgets/{id}/ when auth lands.

// The budget lives in the browser (lib/budget-store.ts) and every edit re-POSTs
// the whole thing to /api/calculate/.
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query'
import type { Dispatch, SetStateAction } from 'react'

import { api, ApiError } from '@/lib/api'
import {
  type BudgetInput,
  getBudgetInput,
  seedMultipliers,
  setBudgetInput,
  toCalculateRequest,
  useBudgetInput,
} from '@/lib/budget-store'
import type {
  BudgetDetail,
  CalculateStaffLine,
  NonStaffLine,
  ProjectInfoInput,
  StaffLineInput,
} from '@/types'
import { useLookups } from './lookups'

export const budgetKey = ['budget'] as const

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

/** Writes the edit locally first, so a failed request never loses what was typed. */
function useBudgetMutation<TVariables>(
  apply: (current: BudgetInput, variables: TVariables) => BudgetInput,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (variables: TVariables) => {
      const next = apply(getBudgetInput(), variables)
      setBudgetInput(next)
      return calculate(next)
    },
    onSuccess: (budget) => {
      queryClient.setQueryData(budgetKey, budget)
    },
    // A rejected edit leaves the store holding what was typed while the cache
    // keeps the last good budget, which looks like nothing happened. Say so.
    onError: (error) => {
      if (error instanceof ApiError) {
        console.error(
          'calculate rejected the budget:',
          error.message,
          error.fields,
        )
        return
      }
      console.error('calculate failed:', error)
    },
  })
}

const nextStaffId = (lines: CalculateStaffLine[]) =>
  Math.max(0, ...lines.map((line) => line.id)) + 1

export function useAddStaffLine() {
  return useBudgetMutation((current, line: StaffLineInput) => ({
    ...current,
    staff_lines: [
      ...current.staff_lines,
      {
        id: nextStaffId(current.staff_lines),
        name_role: line.name_role,
        employment_type: line.employment_type,
        category: line.category,
        classification: line.classification,
        time_basis: line.time_basis,
        in_kind: line.in_kind ?? false,
        by_year: line.allocations ?? [],
      },
    ],
  }))
}

export function useRemoveStaffLine() {
  return useBudgetMutation((current, lineId: number) => ({
    ...current,
    staff_lines: current.staff_lines.filter((line) => line.id !== lineId),
  }))
}

// The engine reads none of these and nothing is derived from them, so editing
// one needs no round trip. Duration, department, activity and region are absent
// deliberately: they change the year columns or the account string.
const DISPLAY_ONLY_PROJECT_FIELDS = new Set([
  'title',
  'chief_investigator',
  'funder',
  'other_funder',
  'other_funder_category',
  'scheme',
  'additional_information',
])

export function useUpdateProjectFields() {
  const queryClient = useQueryClient()
  const recalculate = useBudgetMutation(
    (current, patch: Partial<ProjectInfoInput>) => ({
      ...current,
      project_info: { ...current.project_info, ...patch },
    }),
  )

  const mutate = (patch: Partial<ProjectInfoInput>) => {
    const changed = Object.keys(patch)
    if (!changed.every((field) => DISPLAY_ONLY_PROJECT_FIELDS.has(field))) {
      recalculate.mutate(patch)
      return
    }

    const current = getBudgetInput()
    setBudgetInput({
      ...current,
      project_info: { ...current.project_info, ...patch },
    })
    queryClient.setQueryData(
      budgetKey,
      (budget: BudgetDetail | undefined) =>
        budget && {
          ...budget,
          project_info: { ...budget.project_info, ...patch },
        },
    )
  }

  return { mutate }
}

export function useUpdateBudgetField() {
  return useBudgetMutation(
    (current, update: { field: string; value: unknown }) => ({
      ...current,
      budget_info: { ...current.budget_info, [update.field]: update.value },
    }),
  )
}

interface StaffFieldUpdate {
  row_id: number
  field: string
  value: unknown
  year?: number
}

function applyStaffField(
  line: CalculateStaffLine,
  update: StaffFieldUpdate,
): CalculateStaffLine {
  if (update.field !== 'year_value') {
    return { ...line, [update.field]: update.value }
  }

  const by_year = (line.by_year ?? []).filter(
    (entry) => entry.year !== update.year,
  )
  return {
    ...line,
    by_year: [
      ...by_year,
      { year: update.year!, time: update.value as number },
    ].sort((a, b) => a.year - b.year),
  }
}

export function useUpdateStaffField() {
  return useBudgetMutation((current, update: StaffFieldUpdate) => ({
    ...current,
    staff_lines: current.staff_lines.map((line) =>
      line.id === update.row_id ? applyStaffField(line, update) : line,
    ),
  }))
}

export function useUpdateStaffFields() {
  return useBudgetMutation((current, updates: StaffFieldUpdate[]) => ({
    ...current,
    staff_lines: current.staff_lines.map((line) =>
      updates
        .filter((update) => update.row_id === line.id)
        .reduce(applyStaffField, line),
    ),
  }))
}

/** Same setState signature as before, but each change now recalculates. */
export function useNonStaffLines(): [
  NonStaffLine[],
  Dispatch<SetStateAction<NonStaffLine[]>>,
] {
  const input = useBudgetInput()
  const mutation = useBudgetMutation(
    (current, update: SetStateAction<NonStaffLine[]>) => ({
      ...current,
      non_staff_lines:
        typeof update === 'function' ? update(current.non_staff_lines) : update,
    }),
  )

  return [input.non_staff_lines, mutation.mutate]
}
