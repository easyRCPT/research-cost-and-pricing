import { lineTotal } from '@/lib/non-staff'
import type { BudgetDetail, NonStaffLine, StaffLine } from '@/types'
import type { CostRow } from '@/screens/inkind/InKindFlagsTable'
import type { Dispatch, SetStateAction } from 'react'

const detailOf = (line: StaffLine) =>
  [line.category, line.employment_type, line.classification]
    .filter(Boolean)
    .join(' · ') || '—'

export const costRows = (
  budget: BudgetDetail,
  nonStaff: {
    lines: NonStaffLine[]
    years: number[]
    setLines: Dispatch<SetStateAction<NonStaffLine[]>>
  },
  toggleStaff: (line: StaffLine, value: boolean) => void,
): CostRow[] => [
  ...[...budget.staff_cost.lines, ...budget.staff_in_kind_cost.lines].map(
    (line) => ({
      key: `staff-${line.id}`,
      label: line.name_role || '(unnamed person)',
      detail: detailOf(line),
      cost: line.total,
      inKind: line.in_kind,
      toggle: (value: boolean) => toggleStaff(line, value),
    }),
  ),
  ...nonStaff.lines
    .filter((line) => line.cost_group || line.description)
    .map((line) => ({
      key: `non-staff-${line.id}`,
      label: line.description || line.cost_group || '(untitled cost)',
      detail: line.cost_group || '—',
      cost: lineTotal(line, nonStaff.years),
      inKind: line.in_kind,
      toggle: (value: boolean) =>
        nonStaff.setLines((current) =>
          current.map((row) =>
            row.id === line.id ? { ...row, in_kind: value } : row,
          ),
        ),
    })),
]
