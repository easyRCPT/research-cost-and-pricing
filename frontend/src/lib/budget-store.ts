// TODO: temporary. Delete this file when auth lands and the budget goes back to
// the database.

// Holds the whole budget in the browser, because v1 has no auth.
import { useSyncExternalStore } from 'react'

import type {
  BudgetInfoInput,
  CalculateNonStaffLine,
  CalculateRequest,
  CalculationConstant,
  NonStaffLine,
  ProjectInfoInput,
  StaffLine,
} from '@/types'
import { EMPTY_PROJECT, STARTING_ROWS } from './constants'
import { emptyNonStaffLine } from './non-staff'
import { emptyStaffLine, isRated, toInput } from './staff'

/** The budget as the browser holds it, before the engine has seen it. */
export interface BudgetInput {
  project_info: ProjectInfoInput
  budget_info: BudgetInfoInput
  /** Response-shaped: the screens render these rows directly. */
  staff_lines: StaffLine[]
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

const startingRows = <T>(
  empty: (id: number, years: number[]) => T,
  years: number[],
) =>
  Array.from({ length: STARTING_ROWS }, (_, index) =>
    empty(-(index + 1), years),
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
    staff_lines: startingRows(emptyStaffLine, years),
    non_staff_lines: startingRows(emptyNonStaffLine, years),
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

export const isCosted = (line: NonStaffLine) =>
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
  staff_lines: input.staff_lines.filter(isRated).map(toInput),
  non_staff_lines: input.non_staff_lines.filter(isCosted).map(toNonStaffInput),
})

/**
 * Applies an edit to the browser copy of the budget. Every edit goes through
 * here, so there is one place for persistence to land.
 */
export function savePatch(change: (budget: BudgetInput) => BudgetInput) {
  const next = change(budget)
  setBudgetInput(next)
  // TODO: uncomment when auth lands. Persistence is the only thing missing.
  // api.PATCH('/api/budgets/{id}/', { body: next })
  return next
}

/**
 * The request minus the fields the engine only echoes back. Two inputs with
 * the same fingerprint price the same, so only a change here needs the engine.
 */
function priceFingerprint(input: BudgetInput) {
  const {
    project_info: project,
    budget_info: info,
    staff_lines = [],
    non_staff_lines = [],
  } = toCalculateRequest(input)

  return JSON.stringify([
    [
      project.start_year,
      project.start_month,
      project.end_year,
      project.end_month,
    ],
    // The account string, which the response shows.
    [project.company, project.cost_centre, project.activity, project.region],
    [
      info.cost_multiplier,
      info.in_kind_multiplier,
      info.margin,
      info.gst_applicable,
      info.cash_co_contribution,
    ],
    // name_role and description are echoed back, everything else is priced.
    staff_lines.map((line) => [
      line.id,
      line.employment_type,
      line.category,
      line.classification,
      line.time_basis,
      line.in_kind,
      line.by_year,
    ]),
    non_staff_lines.map((line) => [
      line.id,
      line.cost_group,
      line.expense_type,
      line.in_kind,
      line.add_ten_percent,
      line.indirect_rate_multiplier,
      line.by_year,
    ]),
  ])
}

export const changesPrice = (before: BudgetInput, after: BudgetInput) =>
  priceFingerprint(before) !== priceFingerprint(after)
