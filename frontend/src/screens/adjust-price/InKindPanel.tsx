import { useBudget, useStaffLines, type NonStaffLines } from '@/api/budget'
import { Derived, Ledger, LedgerRow, Panel } from '@/components/shell'
import { money } from '@/lib/format/utils'
import { costRows } from '@/lib/in-kind'
import { InKindFlagsTable } from '../inkind/InKindFlagsTable'

const amount = (value: number) => <Derived>{money(value)}</Derived>

interface InKindPanelProps {
  nonStaff: NonStaffLines
}

export function InKindPanel({ nonStaff }: InKindPanelProps) {
  const { data: budget } = useBudget()
  const staff = useStaffLines(budget.years)

  const summary = budget.budget_summary.price_summary
  const rows = costRows(budget, staff, nonStaff)

  return (
    <Panel title="Identifying in-kind contributions">
      <InKindFlagsTable rows={rows} />

      <Ledger className="mt-4">
        <tbody>
          <LedgerRow
            label="In-kind staff costs"
            value={amount(summary.in_kind_staff_cost)}
          />
          <LedgerRow
            label="In-kind non-staff costs"
            value={amount(summary.in_kind_non_staff_cost)}
          />
          <LedgerRow
            tone="rule"
            label="Total in-kind (University investment)"
            value={amount(summary.in_kind_project_cost)}
          />
        </tbody>
      </Ledger>
    </Panel>
  )
}
