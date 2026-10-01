import { useBudget, useLines } from '@/api/budget'
import { Ledger, LedgerRow, Money, Panel } from '@/components/shell'
import { costRows } from '@/lib/in-kind'
import { InKindFlagsTable } from '@/screens/inkind/InKindFlagsTable'

export function InKindPanel() {
  const { data: budget } = useBudget()
  const staff = useLines('staff', budget.years)
  const nonStaff = useLines('non_staff', budget.years)

  const summary = budget.budget_summary.price_summary
  const rows = costRows(budget, staff, nonStaff)

  return (
    <Panel title="Identifying in-kind contributions">
      <InKindFlagsTable rows={rows} />

      <Ledger className="mt-4">
        <tbody>
          <LedgerRow
            label="In-kind staff costs"
            value={<Money value={summary.in_kind_staff_cost} />}
          />
          <LedgerRow
            label="In-kind non-staff costs"
            value={<Money value={summary.in_kind_non_staff_cost} />}
          />
          <LedgerRow
            tone="rule"
            label="Total in-kind (University investment)"
            value={<Money value={summary.in_kind_project_cost} />}
          />
        </tbody>
      </Ledger>
    </Panel>
  )
}
