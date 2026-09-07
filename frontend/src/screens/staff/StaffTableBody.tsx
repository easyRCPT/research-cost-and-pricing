import {
  Calc,
  CellChoice,
  CellNumber,
  CellTd,
  CellText,
  Td,
} from '@/components/shell'
import { Button } from '@/components/ui/button'
import { dash } from '@/lib/format/utils'
import {
  EMPLOYMENT_TYPES,
  classificationsFor,
  costFor,
  staffCategories,
  timeBasesFor,
  timeFor,
  withTime,
} from '@/lib/staff'
import type { SalaryRate, SalaryRateMultiplier, StaffLine } from '@/types'
import { X } from 'lucide-react'

interface StaffTableBodyProps {
  lines: StaffLine[]
  years: number[]
  salaryRates: SalaryRate[]
  multipliers: SalaryRateMultiplier[]
  patchLine: (id: number, patch: Partial<StaffLine>) => void
  removeLine: (id: number) => void
}

export function StaffTableBody({
  lines,
  years,
  salaryRates,
  multipliers,
  patchLine,
  removeLine,
}: StaffTableBodyProps) {
  const categories = staffCategories(salaryRates)

  return (
    <tbody>
      {lines.map((line) => (
        <tr key={line.id}>
          <CellTd>
            <CellText
              className="min-w-44"
              value={line.name_role}
              onChange={(e) =>
                patchLine(line.id, { name_role: e.target.value })
              }
            />
          </CellTd>
          <CellTd>
            <CellChoice
              value={line.employment_type}
              options={EMPLOYMENT_TYPES}
              placeholder="—"
              onChange={(employment_type) => {
                const bases = timeBasesFor(multipliers, employment_type)
                patchLine(line.id, {
                  employment_type,
                  ...(bases.includes(line.time_basis)
                    ? {}
                    : { time_basis: bases[0] ?? line.time_basis }),
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
              placeholder="—"
              disabled={!line.employment_type}
              onChange={(time_basis) => patchLine(line.id, { time_basis })}
            />
          </CellTd>
          <Calc
            className={line.rate_2025 ? undefined : 'text-muted-foreground'}
          >
            {dash(line.rate_2025)}
          </Calc>
          {years.map((year) => [
            <CellTd key={`${year}-time`}>
              <CellNumber
                className="w-20"
                min={0}
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
              className={
                costFor(line, year) ? undefined : 'text-muted-foreground'
              }
            >
              {dash(costFor(line, year))}
            </Calc>,
          ])}
          <Td align="center">
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={`Remove ${line.name_role || 'row'}`}
              className="text-muted-foreground hover:bg-bad-bg hover:text-bad"
              onClick={() => removeLine(line.id)}
            >
              <X />
            </Button>
          </Td>
        </tr>
      ))}

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
