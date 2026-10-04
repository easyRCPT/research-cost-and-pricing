import { CellNumber, CellTd } from '@/components/shell'
import { toastOutOfRange } from '@/lib/range'
import {
  costFor,
  maxTimeFor,
  timeFor,
  timeLabelFor,
  withTime,
} from '@/lib/staff'
import type { EditableStaffLine } from '@/types'

import { StaffFigureCell } from './StaffFigureCell'

interface StaffYearCellsProps {
  line: EditableStaffLine
  years: number[]
  patchLine: (id: string, patch: Partial<EditableStaffLine>) => void
}

export function StaffYearCells({
  line,
  years,
  patchLine,
}: StaffYearCellsProps) {
  return years.map((year) => [
    <CellTd key={`${year}-time`}>
      <CellNumber
        min={0}
        max={maxTimeFor(line.time_basis)}
        onOutOfRange={() =>
          toastOutOfRange(
            timeLabelFor(line.time_basis),
            0,
            maxTimeFor(line.time_basis),
          )
        }
        value={timeFor(line, year)}
        onChange={(time) =>
          patchLine(line.id, {
            by_year: withTime(line, years, year, time),
          })
        }
      />
    </CellTd>,
    <StaffFigureCell key={`${year}-total`} value={costFor(line, year)} />,
  ])
}
