import type {
  BudgetInfoInput,
  NonStaffLine,
  ProjectInfoInput,
  StaffLine,
} from '@/types'
import { EMPTY_PROJECT, STARTING_ROWS } from '@/lib/constants'
import { emptyNonStaffLine } from '@/lib/non-staff'
import { emptyStaffLine } from '@/lib/staff'

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

export function initialBudget(): BudgetInput {
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
