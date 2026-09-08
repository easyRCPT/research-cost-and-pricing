// TODO: temporary. Point these hooks back at /api/budgets/{id}/ when auth lands.

// The budget lives in the browser (lib/budget-store.ts). Every edit patches it;
// an edit that moves a priced field also re-POSTs the whole thing to /api/calculate/.
import { useState } from 'react'
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
  changesPrice,
  getBudgetInput,
  savePatch,
  seedMultipliers,
  toCalculateRequest,
  useBudgetInput,
} from '@/lib/budget-store'
import type {
  BudgetDetail,
  BudgetInfoInput,
  NonStaffLine,
  ProjectInfoInput,
  StaffLine,
} from '@/types'
import { useLookups } from './lookups'
import { emptyNonStaffLine } from '@/lib/non-staff'
import { emptyStaffLine } from '@/lib/staff'
import { useDebounced } from '@/lib/use-debounced'
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

/** Prices the budget the store already holds. */
function useRecalculate() {
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

/** The edit, echoed onto the cached budget. These two are read from it. */
const echo = (budget: BudgetDetail, input: BudgetInput): BudgetDetail => ({
  ...budget,
  project_info: { ...budget.project_info, ...input.project_info },
  budget_info: {
    ...budget.budget_info,
    ...input.budget_info,
    // Nothing edits deliverables yet, and the response types them more
    // strictly than the request does.
    deliverables: budget.budget_info.deliverables,
  },
})

/**
 * Every edit patches the store and shows immediately. Calculating is the extra
 * step, taken only when the change moved something the engine reads.
 */
function useCommit() {
  const queryClient = useQueryClient()
  const recalculate = useRecalculate()

  return (change: (budget: BudgetInput) => BudgetInput) => {
    const before = getBudgetInput()
    const after = savePatch(change)
    queryClient.setQueryData(
      budgetKey,
      (budget: BudgetDetail | undefined) => budget && echo(budget, after),
    )
    if (changesPrice(before, after)) recalculate.mutate(after)
  }
}

/** What was typed, ahead of the engine's echo. Inputs fall back to this, not the cache. */
export const useBudgetInfo = () => useBudgetInput().budget_info

/**
 * What is typed, held locally until it settles, so a keystroke never
 * re-renders the screen it is typed on.
 */
function useDraft<T>(stored: T, save: (value: T) => void, delay: number) {
  const [draft, setDraft] = useState<T | null>(null)

  const flush = useDebounced((value: T) => {
    setDraft(null)
    save(value)
  }, delay)

  return {
    value: draft ?? stored,
    onChange: (value: T) => {
      setDraft(value)
      flush(value)
    },
  }
}

/** One budget_info field, bound to an input. */
export function useField<K extends keyof BudgetInfoInput>(
  field: K,
  delay = 400,
) {
  const stored = useBudgetInfo()[field]
  const commit = useCommit()

  return useDraft(
    stored,
    (value: BudgetInfoInput[K]) =>
      commit((budget) => ({
        ...budget,
        budget_info: { ...budget.budget_info, [field]: value },
      })),
    delay,
  )
}

/** One project_info field, bound to an input. */
export function useProjectField<K extends keyof ProjectInfoInput>(
  field: K,
  delay = 400,
) {
  const stored = useBudgetInput().project_info[field]
  const commit = useCommit()

  return useDraft(
    stored,
    (value: ProjectInfoInput[K]) =>
      commit((budget) => ({
        ...budget,
        project_info: { ...budget.project_info, [field]: value },
      })),
    delay,
  )
}

/** budget_info fields with no input behind them, such as the submit button. */
export function useSetBudgetField() {
  const commit = useCommit()
  return <K extends keyof BudgetInfoInput>(
    field: K,
    value: BudgetInfoInput[K],
  ) =>
    commit((budget) => ({
      ...budget,
      budget_info: { ...budget.budget_info, [field]: value },
    }))
}

export function useUpdateProject() {
  const commit = useCommit()
  return (patch: Partial<ProjectInfoInput>) =>
    commit((budget) => ({
      ...budget,
      project_info: { ...budget.project_info, ...patch },
    }))
}

/** One editable list of rows in the store. */
interface LineList<T extends { id: number }> {
  read: (input: BudgetInput) => T[]
  write: (input: BudgetInput, lines: T[]) => BudgetInput
  empty: (id: number, years: number[]) => T
}

const STAFF_LINES: LineList<StaffLine> = {
  read: (input) => input.staff_lines,
  write: (input, staff_lines) => ({ ...input, staff_lines }),
  empty: emptyStaffLine,
}

const NON_STAFF_LINES: LineList<NonStaffLine> = {
  read: (input) => input.non_staff_lines,
  write: (input, non_staff_lines) => ({ ...input, non_staff_lines }),
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

function useLines<T extends { id: number }>(
  list: LineList<T>,
  years: number[],
): Lines<T> {
  const lines = list.read(useBudgetInput())
  const commit = useCommit()

  const rewrite = (next: (rows: T[]) => T[]) =>
    commit((budget) => list.write(budget, next(list.read(budget))))

  return {
    lines,
    years,
    patchLine: (id, patch) =>
      rewrite((rows) =>
        rows.map((line) => (line.id === id ? { ...line, ...patch } : line)),
      ),
    addLine: () =>
      rewrite((rows) => [...rows, list.empty(nextTempId(rows), years)]),
    removeLine: (id) =>
      rewrite((rows) => rows.filter((line) => line.id !== id)),
  }
}

export const useStaffLines = (years: number[]) => useLines(STAFF_LINES, years)

export const useNonStaffLines = (years: number[]) =>
  useLines(NON_STAFF_LINES, years)
