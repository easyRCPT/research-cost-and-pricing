import {
  Calc,
  CellChoice,
  CellNumber,
  CellTd,
  CellText,
  Derived,
  Td,
} from '@/components/shell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { dash } from '@/lib/format/utils'
import { toastOutOfRange } from '@/lib/range'
import {
  EMPLOYMENT_TYPES,
  clampedByYear,
  classificationsFor,
  costFor,
  maxTimeFor,
  timeBasesFor,
  timeFor,
  timeLabelFor,
  withTime,
} from '@/lib/staff'
import { cn } from '@/lib/utils'
import type {
  EditableStaffLine,
  SalaryRate,
  SalaryRateMultiplier,
} from '@/types'
import { X } from 'lucide-react'

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

  function setEmploymentType(employment_type: string) {
    const selected = employment_type as EditableStaffLine['employment_type']
    const allowed = timeBasesFor(multipliers, selected)
    if (allowed.includes(line.time_basis)) {
      patchLine(line.id, { employment_type: selected })
      return
    }
    const time_basis = (allowed[0] ??
      line.time_basis) as EditableStaffLine['time_basis']
    patchLine(line.id, {
      employment_type: selected,
      time_basis,
      by_year: clampedByYear(line, time_basis),
    })
  }

  function setCategory(category: string) {
    const selected = category as EditableStaffLine['category']
    const options = classificationsFor(salaryRates, category)
    patchLine(line.id, {
      category: selected,
      ...(options.includes(line.classification)
        ? {}
        : { classification: options[0] ?? line.classification }),
    })
  }

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
          onChange={setEmploymentType}
        />
      </CellTd>
      <CellTd>
        <CellChoice
          value={line.category}
          options={categories}
          placeholder="—"
          onChange={setCategory}
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
      <Calc
        className={!excluded && line.rate ? undefined : 'text-muted-foreground'}
      >
        <Derived>{dash(excluded ? 0 : line.rate)}</Derived>
      </Calc>
      {years.map((year) => [
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
        <Calc
          key={`${year}-total`}
          className={cn(
            !excluded && costFor(line, year)
              ? undefined
              : 'text-muted-foreground',
            excluded && 'line-through',
          )}
        >
          <Derived>{dash(excluded ? 0 : costFor(line, year))}</Derived>
        </Calc>,
      ])}
      <Calc
        className={cn(
          !excluded && line.total ? undefined : 'text-muted-foreground',
          excluded && 'line-through',
        )}
      >
        <Derived>{dash(excluded ? 0 : line.total)}</Derived>
      </Calc>
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
