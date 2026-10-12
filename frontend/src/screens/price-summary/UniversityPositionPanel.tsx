import { Ledger, LedgerRow, Money, Panel } from '@/components/shell'
import type { PriceSummary } from '@/types'

interface UniversityPositionPanelProps {
  summary: PriceSummary
}

export function UniversityPositionPanel({
  summary,
}: UniversityPositionPanelProps) {
  return (
    <Panel
      title="University position"
      description="The price excluding GST less the full project cost and cash co-contribution. Full project cost includes in-kind costs; in-kind and cash contributions are listed separately."
      className="mt-4"
    >
      <Ledger>
        <tbody>
          <LedgerRow
            label="Cash benefit/cost"
            value={<Money value={summary.cash_benefit} tone="sign" />}
          />
          <LedgerRow
            label="Total In-kind contribution (University investment)"
            value={<Money value={summary.total_in_kind_contribution} />}
          />
          <LedgerRow
            label="Total Cash Co-Contribution (Department, Faculty and Chancellery)"
            value={<Money value={summary.total_cash_co_contribution} />}
          />
          <LedgerRow
            tone="rule"
            label="University Position"
            value={<Money value={summary.university_position} tone="sign" />}
          />
        </tbody>
      </Ledger>
    </Panel>
  )
}
