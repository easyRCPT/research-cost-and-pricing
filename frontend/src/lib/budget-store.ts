// TODO: temporary. Delete this file when auth lands and the budget goes back to
// the database.

// Holds the whole budget in the browser, because v1 has no auth.
import { useSyncExternalStore } from 'react'

import type {
  BudgetInfoInput,
  CalculateNonStaffLine,
  CalculateRequest,
  CalculateStaffLine,
  CalculationConstant,
  NonStaffLine,
  ProjectInfoInput,
} from '@/types'
import { EMPTY_PROJECT, STARTING_ROWS } from './constants'
import { emptyNonStaffLine } from './non-staff'

/** The budget as the browser holds it, before the engine has seen it. */
export interface BudgetInput {
  project_info: ProjectInfoInput
  budget_info: BudgetInfoInput
  staff_lines: CalculateStaffLine[]
  /** Response-shaped: the non-staff screens render these rows directly. */
  non_staff_lines: NonStaffLine[]
}

/** Only until the real value arrives from calculation_constants. */
const FALLBACK_MULTIPLIER = 1.7
const DEFAULT_MARGIN = 0.3

export const yearsOf = (project: ProjectInfoInput): number[] =>
  Array.from(
    { length: Math.max(0, project.end_year - project.start_year + 1) },
    (_, index) => project.start_year + index,
  )

function initialBudget(): BudgetInput {
  const years = yearsOf(EMPTY_PROJECT)

  return {
    project_info: { ...EMPTY_PROJECT },
    budget_info: {
      mode: 'full',
      cost_multiplier: FALLBACK_MULTIPLIER,
      in_kind_multiplier: FALLBACK_MULTIPLIER,
      margin: DEFAULT_MARGIN,
      gst_applicable: true,
      cash_co_contribution: 0,
      comments: '',
      justification: '',
      justification_notes: '',
      dean_exemption_reason: '',
      status: 'draft',
      deliverables: [],
    },
    staff_lines: [],
    non_staff_lines: Array.from({ length: STARTING_ROWS }, (_, index) =>
      emptyNonStaffLine(-(index + 1), years),
    ),
  }
}

let budget = initialBudget()
let multipliersSeeded = false

const listeners = new Set<() => void>()

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export const getBudgetInput = () => budget

export function setBudgetInput(next: BudgetInput) {
  budget = next
  for (const listener of listeners) listener()
}

export const useBudgetInput = () =>
  useSyncExternalStore(subscribe, getBudgetInput)

/** Takes the default multipliers off the lookups, once, before the first calculate. */
export function seedMultipliers(constants: readonly CalculationConstant[]) {
  if (multipliersSeeded) return
  multipliersSeeded = true

  const valueOf = (name: string) =>
    constants.find((constant) => constant.name === name)?.value

  const cost = valueOf('full_cost_recovery_multiplier')
  const inKind = valueOf('in_kind_multiplier')

  budget = {
    ...budget,
    budget_info: {
      ...budget.budget_info,
      cost_multiplier: cost ?? budget.budget_info.cost_multiplier,
      in_kind_multiplier: inKind ?? budget.budget_info.in_kind_multiplier,
    },
  }
}

const isCosted = (line: NonStaffLine) =>
  line.cost_group !== '' && line.expense_type !== ''

const toNonStaffInput = (line: NonStaffLine): CalculateNonStaffLine => ({
  id: line.id,
  cost_group: line.cost_group,
  expense_type: line.expense_type,
  description: line.description,
  in_kind: line.in_kind,
  add_ten_percent: line.add_ten_percent,
  indirect_rate_multiplier: line.indirect_rate_multiplier,
  by_year: line.by_year.map(({ year, amount }) => ({ year, amount })),
})

/** Blank rows are dropped: the engine has no rate to price them against. */
export const toCalculateRequest = (input: BudgetInput): CalculateRequest => ({
  project_info: input.project_info,
  budget_info: input.budget_info,
  staff_lines: input.staff_lines,
  non_staff_lines: input.non_staff_lines.filter(isCosted).map(toNonStaffInput),
})
