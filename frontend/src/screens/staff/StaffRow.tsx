import { X } from 'lucide-react'

import { CellChoice, CellTd, CellText, Td } from '@/components/shell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  categoryPatch,
  clampedByYear,
  classificationsFor,
  EMPLOYMENT_TYPES,
  employmentTypePatch,
  timeBasesFor,
} from '@/lib/staff'
import { cn } from '@/lib/utils'
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
  ciIncluded: boolean
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
  ciIncluded,
  patchLine,
  removeLine,
}: StaffRowProps) {
  // An excluded row is neither charged nor in-kind: it is simply not part
  // of what the project costs, so it carries no figures.
  const excluded = isCi && !ciIncluded

  return (
    <tr className={excluded ? 'opacity-55' : undefined}>
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
              className={cn(
                'disabled:bg-transparent',
                excluded && 'line-through',
              )}
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
          onChange={(time_basis) =>
            patchLine(line.id, {
              time_basis: time_basis as EditableStaffLine['time_basis'],
              by_year: clampedByYear(line, time_basis),
            })
          }
        />
      </CellTd>
      <StaffFigureCell value={line.rate} excluded={excluded} />
      <StaffYearCells
        line={line}
        years={years}
        excluded={excluded}
        patchLine={patchLine}
      />
      <StaffFigureCell value={line.total} excluded={excluded} struck />
      <Td align="center">
        <Button
          variant="ghost"
          size="icon-xs"
          // The CI's row belongs to the project, so it stays.
          disabled={isCi}
          aria-label={`Remove ${line.name_role || 'row'}`}
          className="text-muted-foreground hover:bg-bad-bg hover:text-bad"
          onClick={() => removeLine(line.id)}
        >
          <X />
        </Button>
      </Td>
    </tr>
  )
}
