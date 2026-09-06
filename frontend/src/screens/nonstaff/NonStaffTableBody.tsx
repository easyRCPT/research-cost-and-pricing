import {
  Calc,
  CellChoice,
  CellNumber,
  CellTd,
  CellText,
  Td,
} from '@/components/shell'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { dash } from '@/lib/format/utils'
import {
  amountFor,
  costGroups,
  expenseTypesFor,
  lineTotal,
  tenPercentAllowed,
  withAmount,
} from '@/lib/non-staff'
import type { NonStaffCategory, NonStaffLine } from '@/types'
import { X } from 'lucide-react'

interface NonStaffTableBodyProps {
  lines: NonStaffLine[]
  years: number[]
  categories: NonStaffCategory[]
  patchLine: (id: number, patch: Partial<NonStaffLine>) => void
  removeLine: (id: number) => void
}

export function NonStaffTableBody({
  lines,
  years,
  categories,
  patchLine,
  removeLine,
}: NonStaffTableBodyProps) {
  const groups = costGroups(categories)

  function setCostGroup(line: NonStaffLine, cost_group: string) {
    patchLine(line.id, {
      cost_group,
      expense_type: '',
      add_ten_percent: line.add_ten_percent && tenPercentAllowed(cost_group),
    })
  }

  return (
    <tbody>
      {lines.map((line) => {
        const rowTotal = lineTotal(line, years)

        return (
          <tr key={line.id}>
            <CellTd>
              <CellChoice
                value={line.cost_group}
                options={groups}
                placeholder="Select…"
                onChange={(v) => setCostGroup(line, v)}
              />
            </CellTd>
            <CellTd>
              <CellChoice
                value={line.expense_type}
                options={expenseTypesFor(categories, line.cost_group)}
                placeholder={line.cost_group ? 'Select…' : '—'}
                disabled={!line.cost_group}
                onChange={(expense_type) => patchLine(line.id, { expense_type })}
              />
            </CellTd>
            <CellTd>
              <CellText
                className="min-w-52"
                value={line.description}
                onChange={(e) =>
                  patchLine(line.id, { description: e.target.value })
                }
              />
            </CellTd>
            {years.map((year) => (
              <CellTd key={year}>
                <CellNumber
                  className="w-28"
                  min={0}
                  value={amountFor(line, year)}
                  onChange={(amount) =>
                    patchLine(line.id, {
                      by_year: withAmount(line, years, year, amount),
                    })
                  }
                />
              </CellTd>
            ))}
            <Calc className={rowTotal ? undefined : 'text-muted-foreground'}>
              {dash(rowTotal)}
            </Calc>
            <Td align="center">
              <Checkbox
                className="mx-auto"
                checked={line.add_ten_percent}
                disabled={!tenPercentAllowed(line.cost_group)}
                onCheckedChange={(checked) =>
                  patchLine(line.id, { add_ten_percent: checked === true })
                }
              />
            </Td>
            <Td align="center">
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label={`Remove ${line.description || 'row'}`}
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
            colSpan={6 + years.length}
            className="py-6 text-center text-muted-foreground"
          >
            No non-staff costs yet.
          </Td>
        </tr>
      )}
    </tbody>
  )
}
