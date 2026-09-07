import { useBudget, useUpdateStaffField } from '@/api/budget-lines'
import { Grid, Ledger, LedgerRow, Panel, Td, Th } from '@/components/shell'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Checkbox } from '@/components/ui/checkbox'
import { money } from '@/lib/format/utils'
import { lineTotal } from '@/lib/non-staff'
import type { LookupTables, NonStaffLine, StaffLine } from '@/types'
import type { Dispatch, SetStateAction } from 'react'

interface CostRow {
  key: string
  label: string
  detail: string
  cost: number
  inKind: boolean
  toggle: (value: boolean) => void
}

const detailOf = (line: StaffLine) =>
  [line.category, line.employment_type, line.classification]
    .filter(Boolean)
    .join(' · ') || '—'

export interface InKindProps {
  lookups: LookupTables
  nonStaff: {
    lines: NonStaffLine[]
    years: number[]
    setLines: Dispatch<SetStateAction<NonStaffLine[]>>
  }
}

export function InKind({ nonStaff }: InKindProps) {
  const { data: budget } = useBudget()
  const updateStaffField = useUpdateStaffField()

  const summary = budget.budget_summary.price_summary

  const staffRows: CostRow[] = [
    ...budget.staff_cost.lines,
    ...budget.staff_in_kind_cost.lines,
  ].map((line) => ({
    key: `staff-${line.id}`,
    label: line.name_role || '(unnamed person)',
    detail: detailOf(line),
    cost: line.total,
    inKind: line.in_kind,
    toggle: (value: boolean) =>
      updateStaffField.mutate({
        row_id: line.id,
        field: 'in_kind',
        value,
      }),
  }))

  const nonStaffRows: CostRow[] = nonStaff.lines
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
    }))

  const rows = [...staffRows, ...nonStaffRows]

  return (
    <>
      <Alert>
        <AlertDescription>
          In-kind costs stay in the University's cost and come out of the price.
          Nothing new is entered here. Tick the lines from Staff Costs and
          Non-Staff Costs that the University will absorb.
        </AlertDescription>
      </Alert>

      <Panel
        title="Costs already entered"
        description="Tick a line to have the University absorb it rather than charge the funder for it."
        className="mt-4"
      >
        <Grid>
          <thead>
            <tr>
              <Th>Cost line</Th>
              <Th>Detail</Th>
              <Th align="right" className="w-36">
                Cost (AUD)
              </Th>
              <Th align="center" className="w-24">
                In kind?
              </Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key}>
                <Td>{row.label}</Td>
                <Td className="text-muted-foreground">{row.detail}</Td>
                <Td align="right" className="tabular">
                  {money(row.cost)}
                </Td>
                <Td align="center">
                  <Checkbox
                    className="mx-auto"
                    checked={row.inKind}
                    onCheckedChange={(checked) => row.toggle(checked === true)}
                  />
                </Td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <Td
                  colSpan={4}
                  className="py-6 text-center text-muted-foreground"
                >
                  Nothing costed yet. Add staff or non-staff costs first.
                </Td>
              </tr>
            )}
          </tbody>
        </Grid>
      </Panel>

      <Panel title="Total University investment" className="mt-4">
        <Ledger>
          <tbody>
            <LedgerRow
              label="In-kind staff costs"
              value={money(summary.in_kind_staff_cost)}
            />
            <LedgerRow
              label="In-kind non-staff costs"
              value={money(summary.in_kind_non_staff_cost)}
            />
            <LedgerRow
              tone="rule"
              label="Total in-kind (University investment)"
              value={money(summary.in_kind_project_cost)}
            />
          </tbody>
        </Ledger>
      </Panel>
    </>
  )
}
