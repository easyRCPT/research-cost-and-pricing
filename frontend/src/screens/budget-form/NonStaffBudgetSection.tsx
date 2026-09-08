import { Ledger, LedgerRow, PartBar } from '@/components/shell'
import { money } from '@/lib/format/utils'
import { costGroups } from '@/lib/non-staff'
import type { LookupTables, NonStaffBudget } from '@/types'

interface NonStaffBudgetSectionProps {
  nonStaffBudget: NonStaffBudget
  lookups: LookupTables
}

export function NonStaffBudgetSection({
  nonStaffBudget,
  lookups,
}: NonStaffBudgetSectionProps) {
  return (
    <>
      <PartBar>Part F — Non-Staff Budget</PartBar>
      <Ledger>
        <tbody>
          {costGroups(lookups.non_staff_cost_categories).map((group) => (
            <LedgerRow
              key={group}
              label={group}
              value={money(nonStaffBudget.category_totals[group] ?? 0)}
            />
          ))}
          <LedgerRow
            tone="rule"
            label="Total Non-Staff Costs"
            value={money(nonStaffBudget.total_non_staff_costs)}
          />
        </tbody>
      </Ledger>
    </>
  )
}
