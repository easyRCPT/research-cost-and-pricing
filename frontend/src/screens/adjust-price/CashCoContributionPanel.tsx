import { useBudget } from '@/api/budget'
import { Derived, Ledger, LedgerRow, Panel } from '@/components/shell'
import { money } from '@/lib/format/utils'

export function CashCoContributionPanel() {
  const { data: budget } = useBudget()

  const summary = budget.budget_summary.price_summary

  return (
    <Panel
      title="Cash co-contribution"
      description="Adjust under costing. Shown here for reference."
      className="mt-4"
    >
      <Ledger>
        <tbody>
          <LedgerRow
            label="Cash co-contribution (Department, Faculty and Chancellery)"
            value={
              <Derived>{money(summary.total_cash_co_contribution)}</Derived>
            }
          />
          <LedgerRow
            tone="rule"
            label="University position"
            value={
              <Derived>
                <span
                  className={
                    summary.university_position < 0 ? 'text-bad' : 'text-good'
                  }
                >
                  {money(summary.university_position)}
                </span>
              </Derived>
            }
          />
        </tbody>
      </Ledger>
    </Panel>
  )
}
