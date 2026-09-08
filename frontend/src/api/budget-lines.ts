// TODO: temporary. Point these hooks back at /api/budgets/{id}/ when auth lands.

// The budget lives in the browser (lib/budget-store.ts) and every edit re-POSTs
// the whole thing to /api/calculate/.
import {
  useIsMutating,
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query'
import type { Dispatch, SetStateAction } from 'react'

import { api, ApiError } from '@/lib/api'
import { toast } from 'sonner'
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

/** Writes the edit locally first, so a failed request never loses what was typed. */
function useRecalculate<TVariables>(
  apply: (current: BudgetInput, variables: TVariables) => BudgetInput,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: calculateKey,
    mutationFn: async (variables: TVariables) => {
      const next = apply(getBudgetInput(), variables)
      setBudgetInput(next)
      const request = ++latestRequest
      const budget = await calculate(next)
      return { budget, request }
    },
    onSuccess: ({ budget, request }) => {
      if (request === latestRequest) queryClient.setQueryData(budgetKey, budget)
    },
    // A rejected edit leaves the store holding what was typed while the cache
    // keeps the last good budget, which looks like nothing happened. Say so.
    onError: (error) => {
      if (error instanceof ApiError) {
        // Frontend UI toast errors
        toast.error('Some of your changes were not applied', {
          id: 'calculate',
          description: errorDescription(error),
        })
        toast.error('Could not reach the calculator', {
          id: 'calculate',
          description: 'Please try again',
        })
        return
      }
    },
  })
}

/** True while any edit is waiting on the engine */
export const useCalculating = () =>
  useIsMutating({ mutationKey: calculateKey }) > 0

const nextStaffId = (lines: CalculateStaffLine[]) =>
  Math.max(0, ...lines.map((line) => line.id)) + 1

export function useAddStaffLine() {
  return useRecalculate((current, line: StaffLineInput) => ({
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
  return useRecalculate((current, lineId: number) => ({
    ...current,
    staff_lines: current.staff_lines.filter((line) => line.id !== lineId),
  }))
}

// What the engine reads. Everything else is echoed back unchanged, so editing
// it needs no round trip. Department alone is echo-only, but its write carries
// cost_centre, which is part of the account string.
const RECALCULATES = {
  project_info: new Set([
    'start_year',
    'start_month',
    'end_year',
    'end_month',
    'company',
    'cost_centre',
    'activity',
    'region',
  ]),
  budget_info: new Set([
    'cost_multiplier',
    'in_kind_multiplier',
    'margin',
    'gst_applicable',
    'cash_co_contribution',
  ]),
}

type PatchSection = keyof typeof RECALCULATES

const mergeSection = <T extends BudgetInput | BudgetDetail>(
  current: T,
  section: PatchSection,
  patch: object,
): T => ({ ...current, [section]: { ...current[section], ...patch } })

/**
 * Recalculates when a patched field is one the engine reads; otherwise writes
 * the store and the cache now and sends nothing. The silent branch becomes
 * PATCH /api/budgets/{id}/ when auth lands.
 */
function useUpdateSection(section: PatchSection) {
  const queryClient = useQueryClient()
  const recalculate = useRecalculate((current, patch: object) =>
    mergeSection(current, section, patch),
  )

  return (patch: object) => {
    const fields = Object.keys(patch)
    if (fields.some((field) => RECALCULATES[section].has(field))) {
      recalculate.mutate(patch)
      return
    }
    setBudgetInput(mergeSection(getBudgetInput(), section, patch))
    queryClient.setQueryData(
      budgetKey,
      (budget: BudgetDetail | undefined) =>
        budget && mergeSection(budget, section, patch),
    )
  }
}

export function useUpdateProjectFields() {
  const update = useUpdateSection('project_info')
  return { mutate: (patch: Partial<ProjectInfoInput>) => update(patch) }
}

export function useUpdateBudgetField() {
  const update = useUpdateSection('budget_info')
  return {
    mutate: ({ field, value }: { field: string; value: unknown }) =>
      update({ [field]: value }),
  }
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
  return useRecalculate((current, update: StaffFieldUpdate) => ({
    ...current,
    staff_lines: current.staff_lines.map((line) =>
      line.id === update.row_id ? applyStaffField(line, update) : line,
    ),
  }))
}

export function useUpdateStaffFields() {
  return useRecalculate((current, updates: StaffFieldUpdate[]) => ({
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
  const mutation = useRecalculate(
    (current, update: SetStateAction<NonStaffLine[]>) => ({
      ...current,
      non_staff_lines:
        typeof update === 'function' ? update(current.non_staff_lines) : update,
    }),
  )

  return [input.non_staff_lines, mutation.mutate]
}
