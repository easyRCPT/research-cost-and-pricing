import type { BudgetInput } from './budget-input'
import { toCalculateRequest } from './calculate-request'

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
