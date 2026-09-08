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
  allClassifications,
  allTimeBases,
  clampedByYear,
  classificationsFor,
  costFor,
  maxTimeFor,
  staffCategories,
  timeBasesFor,
  timeFor,
  timeLabelFor,
  withTime,
} from '@/lib/staff'
import { cn } from '@/lib/utils'
import type { SalaryRate, SalaryRateMultiplier, StaffLine } from '@/types'
import { X } from 'lucide-react'

interface StaffTableBodyProps {
  lines: StaffLine[]
  years: number[]
  salaryRates: SalaryRate[]
  multipliers: SalaryRateMultiplier[]
  ciId: number | null
  ciIncluded: boolean
  patchLine: (id: number, patch: Partial<StaffLine>) => void
  removeLine: (id: number) => void
}

export function StaffTableBody({
  lines,
  years,
  salaryRates,
  multipliers,
  ciId,
  ciIncluded,
  patchLine,
  removeLine,
}: StaffTableBodyProps) {
  const categories = staffCategories(salaryRates)
  const classifications = allClassifications(salaryRates)
  const bases = allTimeBases(multipliers)

  return (
    <tbody>
      {lines.map((line) => {
        const isCi = line.id === ciId
        // An excluded row is neither charged nor in-kind: it is simply not part
        // of what the project costs, so it carries no figures.
        const excluded = isCi && !ciIncluded

        return (
          <tr key={line.id} className={excluded ? 'opacity-55' : undefined}>
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
                  onChange={(e) =>
                    patchLine(line.id, { name_role: e.target.value })
                  }
                />
              )}
            </CellTd>
            <CellTd>
              <CellChoice
                value={line.employment_type}
                options={EMPLOYMENT_TYPES}
                placeholder="—"
                onChange={(employment_type) => {
                  const bases = timeBasesFor(multipliers, employment_type)
                  if (bases.includes(line.time_basis)) {
                    patchLine(line.id, { employment_type })
                    return
                  }
                  const time_basis = bases[0] ?? line.time_basis
                  patchLine(line.id, {
                    employment_type,
                    time_basis,
                    by_year: clampedByYear(line, time_basis),
                  })
                }}
              />
            </CellTd>
            <CellTd>
              <CellChoice
                value={line.category}
                options={categories}
                placeholder="—"
                onChange={(category) => {
                  const options = classificationsFor(salaryRates, category)
                  patchLine(line.id, {
                    category,
                    ...(options.includes(line.classification)
                      ? {}
                      : { classification: options[0] ?? line.classification }),
                  })
                }}
              />
            </CellTd>
            <CellTd>
              <CellChoice
                value={line.classification}
                options={classificationsFor(salaryRates, line.category)}
                sizeOptions={classifications}
                placeholder="—"
                disabled={!line.category}
                onChange={(classification) =>
                  patchLine(line.id, { classification })
                }
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
                    time_basis,
                    by_year: clampedByYear(line, time_basis),
                  })
                }
              />
            </CellTd>
            <Calc
              className={
                !excluded && line.rate_2025
                  ? undefined
                  : 'text-muted-foreground'
              }
            >
              <Derived>{dash(excluded ? 0 : line.rate_2025)}</Derived>
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
      })}

      {lines.length === 0 && (
        <tr>
          <Td
            colSpan={7 + years.length * 2}
            className="py-6 text-center text-muted-foreground"
          >
            No staff costs yet.
          </Td>
        </tr>
      )}
    </tbody>
  )
}
