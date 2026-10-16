import type { EditorScreen } from '@/components/shell'
import type { BudgetDetail } from '@/types'

/**
 * Where a submission error should take the researcher.
 *
 * The server answers a refused submit with a plain list of sentences
 * (`submission_validation.py`). Each one maps to the screen that holds the
 * missing detail, and -- where the sentence names a particular line or field
 * -- to the input that needs it, so a "go to" can land as close to the fix as
 * the app reliably can (#215).
 */
export interface ErrorTarget {
  screen: EditorScreen
  /** The id of the field or cost line to focus, when the error names one. */
  focus?: string
}

/** The reason strings the server emits, and where each one is fixed. */
const TARGETS: Record<string, ErrorTarget> = {
  'Project title is required.': { screen: 'details', focus: 'title' },
  'Chief investigator is required.': { screen: 'details', focus: 'ci' },
  'Funder is required.': { screen: 'details', focus: 'funder' },
  'Specify other funder and category.': {
    screen: 'details',
    focus: 'other-funder',
  },
  'Department is required.': { screen: 'details', focus: 'department' },
  'Project end date is required.': { screen: 'details', focus: 'end-year' },
  'The project end date must not be before the project start date.': {
    screen: 'details',
  },
  'Every staff cost line must have a name or role.': { screen: 'staff' },
  'Every staff cost line must have an employment type.': { screen: 'staff' },
  'Every staff cost line must have a category.': { screen: 'staff' },
  'Every staff cost line must have a classification.': { screen: 'staff' },
  'Every staff cost line must have a time basis.': { screen: 'staff' },
  'Every non-staff cost line must have a category.': { screen: 'nonstaff' },
}

/**
 * The in-kind reasons are per line, so the target names the first line still
 * missing one. The row keys on the Adjust Price screen are `staff-<id>` and
 * `non-staff-<id>`, which is exactly what the focus needs.
 */
const IN_KIND_TARGETS: Record<string, (budget: BudgetDetail) => ErrorTarget> = {
  'Every in-kind staff cost line must have a reason.': (budget) => {
    const line = [...budget.staff_cost.lines, ...budget.staff_in_kind_cost.lines]
      .find((candidate) => candidate.in_kind && !candidate.in_kind_reason)
    return { screen: 'adjust', focus: line ? `staff-${line.id}` : undefined }
  },
  'Every in-kind non-staff cost line must have a reason.': (budget) => {
    const line = [
      ...budget.non_staff_cost.lines,
      ...budget.non_staff_in_kind_cost.lines,
    ].find((candidate) => candidate.in_kind && !candidate.in_kind_reason)
    return { screen: 'adjust', focus: line ? `non-staff-${line.id}` : undefined }
  },
}

/** Where a reason takes the researcher, or null when it is not actionable. */
export function reasonTarget(
  reason: string,
  budget: BudgetDetail,
): ErrorTarget | null {
  return (
    TARGETS[reason] ??
    IN_KIND_TARGETS[reason]?.(budget) ??
    null
  )
}

/**
 * Whether the error a "go to" carried still applies.
 *
 * The destination shows the error only while the field or line is still
 * missing it, so a banner does not outlive the fix that cleared it. A reason
 * with no focus (a whole-screen error) cannot be checked cheaply, so it is
 * taken at face value.
 */
export function isStillMissing(
  target: ErrorTarget,
  budget: BudgetDetail,
): boolean {
  if (!target.focus) return true

  if (target.screen === 'details') {
    const project = budget.project_info
    const missing: Record<string, boolean> = {
      title: project.title.trim() === '',
      ci: project.chief_investigator.trim() === '',
      funder: project.funder === '',
      'other-funder':
        project.other_funder === '' || project.other_funder_category === '',
      department: project.cost_centre === '',
      'end-year': project.end_year === null || project.end_month === null,
    }
    return missing[target.focus] ?? true
  }

  if (target.screen === 'adjust') {
    const [kind, id] = target.focus.split('-')
    const lines =
      kind === 'staff'
        ? [...budget.staff_cost.lines, ...budget.staff_in_kind_cost.lines]
        : [
            ...budget.non_staff_cost.lines,
            ...budget.non_staff_in_kind_cost.lines,
          ]
    const line = lines.find((candidate) => candidate.id === id)
    return line ? line.in_kind && !line.in_kind_reason : false
  }

  return true
}
