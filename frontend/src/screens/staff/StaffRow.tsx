import {
  CellChoice,
  CellTd,
  CellText,
  RemoveRowButton,
} from '@/components/shell'
import { Badge } from '@/components/ui/badge'
import {
  categoryPatch,
  classificationsFor,
  EMPLOYMENT_TYPES,
  employmentTypePatch,
  timeBasesFor,
  timeBasisPatch,
} from '@/lib/staff'
import type {
  EditableStaffLine,
  SalaryRate,
  SalaryRateMultiplier,
} from '@/types'

import { StaffFigureCell } from './StaffFigureCell'
import { StaffYearCells } from './StaffYearCells'

interface StaffRowProps {
  line: EditableStaffLine
  years: number[]
  salaryRates: SalaryRate[]
  multipliers: SalaryRateMultiplier[]
  categories: string[]
  classifications: string[]
  bases: string[]
  isCi: boolean
  patchLine: (id: string, patch: Partial<EditableStaffLine>) => void
  removeLine: (id: string) => void
}

export function StaffRow({
  line,
  years,
  salaryRates,
  multipliers,
  categories,
  classifications,
  bases,
  isCi,
  patchLine,
  removeLine,
}: StaffRowProps) {
  return (
    <tr>
      <CellTd>
        {isCi ? (
          // The CI's name is typed on Project Details. The read-only
          // fill sits on the cell so the badge shares it.
          <div className="flex items-center gap-1.5 bg-muted/40 pr-2">
            <CellText
              readOnly
              disabled
              title="Set on Project Details"
              value={line.name_role}
              className="disabled:bg-transparent"
            />
            <Badge variant="secondary" className="shrink-0">
              CI
            </Badge>
          </div>
        ) : (
          <CellText
            value={line.name_role}
            onChange={(name_role) => patchLine(line.id, { name_role })}
          />
        )}
      </CellTd>
      <CellTd>
        <CellChoice
          value={line.employment_type}
          options={EMPLOYMENT_TYPES}
          placeholder="—"
          onChange={(employmentType) =>
            patchLine(
              line.id,
              employmentTypePatch(line, multipliers, employmentType),
            )
          }
        />
      </CellTd>
      <CellTd>
        <CellChoice
          value={line.category}
          options={categories}
          placeholder="—"
          onChange={(category) =>
            patchLine(line.id, categoryPatch(line, salaryRates, category))
          }
        />
      </CellTd>
      <CellTd>
        <CellChoice
          value={line.classification}
          options={classificationsFor(salaryRates, line.category)}
          sizeOptions={classifications}
          placeholder="—"
          disabled={!line.category}
          onChange={(classification) => patchLine(line.id, { classification })}
        />
      </CellTd>
      <CellTd>
        <CellChoice
          value={line.time_basis}
          options={timeBasesFor(multipliers, line.employment_type)}
          sizeOptions={bases}
          placeholder="—"
          disabled={!line.employment_type}
          onChange={(timeBasis) =>
            patchLine(line.id, timeBasisPatch(line, timeBasis))
          }
        />
      </CellTd>
      <StaffFigureCell value={line.rate} />
      <StaffYearCells line={line} years={years} patchLine={patchLine} />
      <StaffFigureCell value={line.total} />
      <RemoveRowButton
        label={`Remove ${line.name_role || 'row'}`}
        // Added and removed by the Include Chief Investigator cost tick (#166).
        disabled={isCi}
        onRemove={() => removeLine(line.id)}
      />
    </tr>
  )
}
