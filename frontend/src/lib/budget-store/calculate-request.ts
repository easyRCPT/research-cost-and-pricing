import type {
  CalculateNonStaffLine,
  CalculateRequest,
  NonStaffLine,
} from '@/types'
import { ciLineId, isRated, toInput, withCiName } from '@/lib/staff'
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

/**
 * Blank rows are dropped: the engine has no rate to price them against. The CI's
 * row goes the same way when their time is not being costed.
 *
 * TODO: give the engine `ci_costs_included` and have it report what the excluded
 * time would have cost. Dropping the row here keeps every total right, but the
 * screen has no figure to show against the row it struck out.
 */
export const toCalculateRequest = (input: BudgetInput): CalculateRequest => {
  const staffLines = withCiName(
    input.staff_lines,
    input.project_info.chief_investigator,
  )
  const excluded = input.ci_costs_included
    ? null
    : ciLineId(staffLines, input.project_info.chief_investigator)

  return {
    project_info: input.project_info,
    budget_info: input.budget_info,
    staff_lines: staffLines
      .filter((line) => line.id !== excluded && isRated(line))
      .map(toInput),
    non_staff_lines: input.non_staff_lines
      .filter(isCosted)
      .map(toNonStaffInput),
  }
}
