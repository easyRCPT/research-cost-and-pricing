import { useBudget } from '@/api/budget'
import { Ledger, LedgerRow, Money, Panel } from '@/components/shell'

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
            value={<Money value={summary.total_cash_co_contribution} />}
          />
          <LedgerRow
            tone="rule"
            label="University position"
            value={<Money value={summary.university_position} tone="sign" />}
          />
        </tbody>
      </Ledger>
    </Panel>
  )
}
