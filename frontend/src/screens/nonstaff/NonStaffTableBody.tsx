import {
  Calc,
  CellChoice,
  CellNumber,
  CellTd,
  CellText,
  EmptyRow,
  RemoveRowButton,
  Td,
} from '@/components/shell'
import { Checkbox } from '@/components/ui/checkbox'
import { dash } from '@/lib/format/utils'
import {
  allExpenseTypes,
  amountFor,
  costGroupPatch,
  costGroups,
  expenseTypesFor,
  tenPercentAllowed,
  withAmount,
} from '@/lib/non-staff'
import { MAX_MONEY, toastOutOfRange } from '@/lib/range'
import type { NonStaffCategory, NonStaffLine } from '@/types'

interface NonStaffTableBodyProps {
  lines: NonStaffLine[]
  years: number[]
  categories: NonStaffCategory[]
  patchLine: (id: string, patch: Partial<NonStaffLine>) => void
  removeLine: (id: string) => void
}

export function NonStaffTableBody({
  lines,
  years,
  categories,
  patchLine,
  removeLine,
}: NonStaffTableBodyProps) {
  const groups = costGroups(categories)
  const expenseTypes = allExpenseTypes(categories)

  return (
    <tbody>
      {lines.map((line) => {
        const rowTotal = line.direct_total

        return (
          <tr key={line.id}>
            <CellTd>
              <CellChoice
                value={line.cost_group}
                options={groups}
                placeholder="Select…"
                onChange={(costGroup) =>
                  patchLine(
                    line.id,
                    costGroupPatch(line, categories, costGroup),
                  )
                }
              />
            </CellTd>
            <CellTd>
              <CellChoice
                value={line.expense_type}
                options={expenseTypesFor(categories, line.cost_group)}
                sizeOptions={expenseTypes}
                placeholder={line.cost_group ? 'Select…' : '—'}
                disabled={!line.cost_group}
                onChange={(expense_type) =>
                  patchLine(line.id, { expense_type })
                }
              />
            </CellTd>
            <CellTd>
              <CellText
                className="min-w-52"
                value={line.description}
                onChange={(description) => patchLine(line.id, { description })}
              />
            </CellTd>
            {years.map((year) => (
              <CellTd key={year}>
                <CellNumber
                  className="w-28"
                  prefix="$"
                  min={0}
                  max={MAX_MONEY}
                  onOutOfRange={() => toastOutOfRange('Amount', 0, MAX_MONEY)}
                  value={amountFor(line, year)}
                  onChange={(amount) =>
                    patchLine(line.id, {
                      by_year: withAmount(line, years, year, amount),
                    })
                  }
                />
              </CellTd>
            ))}
            <Td align="center">
              <Checkbox
                className="mx-auto"
                checked={line.add_ten_percent}
                disabled={!tenPercentAllowed(categories, line.cost_group)}
                onCheckedChange={(checked) =>
                  patchLine(line.id, { add_ten_percent: checked === true })
                }
              />
            </Td>
            <Calc className={rowTotal ? undefined : 'text-muted-foreground'}>
              {dash(rowTotal)}
            </Calc>
            <RemoveRowButton
              label={`Remove ${line.description || 'row'}`}
              onRemove={() => removeLine(line.id)}
            />
          </tr>
        )
      })}

      {lines.length === 0 && (
        <EmptyRow colSpan={6 + years.length}>No non-staff costs yet.</EmptyRow>
      )}
    </tbody>
  )
}
