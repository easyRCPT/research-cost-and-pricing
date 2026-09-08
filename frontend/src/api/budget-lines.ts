// TODO: temporary. Point these hooks back at /api/budgets/{id}/ when auth lands.

// The budget lives in the browser (lib/budget-store.ts) and every edit re-POSTs
// the whole thing to /api/calculate/.
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
  isCosted,
  seedMultipliers,
  setBudgetInput,
  toCalculateRequest,
  useBudgetInput,
} from '@/lib/budget-store'
import type {
  BudgetDetail,
  NonStaffLine,
  ProjectInfoInput,
  StaffLine,
} from '@/types'
import { useLookups } from './lookups'
import { emptyNonStaffLine } from '@/lib/non-staff'
import { emptyStaffLine, isRated } from '@/lib/staff'
import { nextTempId } from '@/lib/utils'

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

/** One editable list of rows in the store, and what the engine makes of it. */
interface LineList<T extends { id: number }> {
  read: (input: BudgetInput) => T[]
  write: (input: BudgetInput, lines: T[]) => BudgetInput
  /** Fields the engine reads. by_year is the store's name for the numbers. */
  recalculates: Set<string>
  /** Rows the request includes. */
  priced: (line: T) => boolean
  empty: (id: number, years: number[]) => T
}

const STAFF_LINES: LineList<StaffLine> = {
  read: (input) => input.staff_lines,
  write: (input, staff_lines) => ({ ...input, staff_lines }),
  recalculates: new Set([
    'employment_type',
    'category',
    'classification',
    'time_basis',
    'in_kind',
    'by_year',
  ]),
  priced: isRated,
  empty: emptyStaffLine,
}

const NON_STAFF_LINES: LineList<NonStaffLine> = {
  read: (input) => input.non_staff_lines,
  write: (input, non_staff_lines) => ({ ...input, non_staff_lines }),
  recalculates: new Set([
    'cost_group',
    'expense_type',
    'in_kind',
    'add_ten_percent',
    'indirect_rate_multiplier',
    'by_year',
  ]),
  priced: isCosted,
  empty: emptyNonStaffLine,
}

export interface Lines<T> {
  lines: T[]
  years: number[]
  patchLine: (id: number, patch: Partial<T>) => void
  addLine: () => void
  removeLine: (id: number) => void
}

export type StaffLines = Lines<StaffLine>
export type NonStaffLines = Lines<NonStaffLine>

type Transform = (current: BudgetInput) => BudgetInput

/**
 * Recalculates only when the engine would see the change: a field it reads,
 * on a row that is (or was) in the request. Everything else writes the store
 * and sends nothing.
 */
function useLines<T extends { id: number }>(
  list: LineList<T>,
  years: number[],
): Lines<T> {
  const lines = list.read(useBudgetInput())
  const recalculate = useRecalculate((current, next: Transform) =>
    next(current),
  )

  const write = (next: Transform, priced: boolean) => {
    if (priced) recalculate.mutate(next)
    else setBudgetInput(next(getBudgetInput()))
  }
  const stored = (id: number) =>
    list.read(getBudgetInput()).find((line) => line.id === id)

  return {
    lines,
    years,
    patchLine: (id, patch) => {
      const before = stored(id)
      if (!before) return
      const engineField = Object.keys(patch).some((field) =>
        list.recalculates.has(field),
      )
      const priced = list.priced(before) || list.priced({ ...before, ...patch })
      write(
        (current) =>
          list.write(
            current,
            list
              .read(current)
              .map((line) => (line.id === id ? { ...line, ...patch } : line)),
          ),
        engineField && priced,
      )
    },
    addLine: () => {
      const current = getBudgetInput()
      const rows = list.read(current)
      setBudgetInput(
        list.write(current, [...rows, list.empty(nextTempId(rows), years)]),
      )
    },
    removeLine: (id) => {
      const line = stored(id)
      write(
        (current) =>
          list.write(
            current,
            list.read(current).filter((line) => line.id !== id),
          ),
        line !== undefined && list.priced(line),
      )
    },
  }
}

export const useStaffLines = (years: number[]) => useLines(STAFF_LINES, years)

export const useNonStaffLines = (years: number[]) =>
  useLines(NON_STAFF_LINES, years)
