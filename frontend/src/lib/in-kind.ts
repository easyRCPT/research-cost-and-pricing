import type { NonStaffLines, StaffLines } from '@/api/budget-lines'
import { lineTotal } from '@/lib/non-staff'
import { withCosts } from '@/lib/staff'
import type { BudgetDetail, StaffLine } from '@/types'
import type { CostRow } from '@/screens/inkind/InKindFlagsTable'

const detailOf = (line: StaffLine) =>
  [line.category, line.employment_type, line.classification]
    .filter(Boolean)
    .join(' · ') || '—'

export const costRows = (
  budget: BudgetDetail,
  staff: StaffLines,
  nonStaff: NonStaffLines,
): CostRow[] => [
  ...withCosts(staff.lines, budget)
    .filter((line) => line.name_role || line.category)
    .map((line) => ({
      key: `staff-${line.id}`,
      kind: 'staff' as const,
      label: line.name_role || '(unnamed person)',
      detail: detailOf(line),
      cost: line.total,
      inKind: line.in_kind,
      toggle: (value: boolean) => staff.patchLine(line.id, { in_kind: value }),
    })),
  ...nonStaff.lines
    .filter((line) => line.cost_group || line.description)
    .map((line) => ({
      key: `non-staff-${line.id}`,
      kind: 'non-staff' as const,
      label: line.description || line.cost_group || '(untitled cost)',
      detail: line.cost_group || '—',
      cost: lineTotal(line, nonStaff.years),
      inKind: line.in_kind,
      toggle: (value: boolean) =>
        nonStaff.patchLine(line.id, { in_kind: value }),
    })),
]
