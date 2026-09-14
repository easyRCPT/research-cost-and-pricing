import { Ledger, LedgerRow, PartBar } from '@/components/shell'
import { money } from '@/lib/format/utils'
import type { StaffBudget } from '@/types'

interface StaffBudgetSectionProps {
  staffBudget: StaffBudget
}

export function StaffBudgetSection({ staffBudget }: StaffBudgetSectionProps) {
  return (
    <>
      <PartBar>Part E — Staff Budget</PartBar>
      <Ledger>
        <tbody>
          {Object.entries(staffBudget.category_totals).map(([label, value]) => (
            <LedgerRow key={label} label={label} value={money(value)} />
          ))}
          <LedgerRow
            tone="rule"
            label="Total Salaries and On-Costs"
            value={money(staffBudget.cost_before_recovery)}
          />
          <LedgerRow
            label="Cost Recovery (Salaries) (723B)"
            value={money(staffBudget.cost_recovery)}
          />
          <LedgerRow
            label="Cost Recovery (Salaries) Multiplier"
            value={staffBudget.cost_recovery_multiplier.toFixed(2)}
          />
          <LedgerRow
            tone="rule"
            label="Total Staff Costs"
            value={money(staffBudget.total_staff_costs)}
          />
        </tbody>
      </Ledger>
    </>
  )
}
