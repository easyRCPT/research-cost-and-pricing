import type {
  CalculateNonStaffLine,
  CalculateRequest,
  NonStaffLine,
} from '@/types'
import { isRated, toInput } from '@/lib/staff'
import type { BudgetInput } from './budget-input'

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
