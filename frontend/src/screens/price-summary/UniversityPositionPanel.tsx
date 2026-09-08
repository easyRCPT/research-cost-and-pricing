import { Ledger, LedgerRow, Money, Panel } from '@/components/shell'
import { NumberInput } from '@/components/ui/number-input'
import type { PriceSummary } from '@/types'

interface UniversityPositionPanelProps {
  summary: PriceSummary
  cash: { value: number; onChange: (value: number) => void }
}

export function UniversityPositionPanel({
  summary,
  cash,
}: UniversityPositionPanelProps) {
  return (
    <Panel
      title="University position"
      description="The surplus or deficit resulting from the project as priced: price to be charged to funder less full project cost, including in-kind and cash contributions."
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
            value={
              <NumberInput
                min={0}
                className="tabular ml-auto h-8 w-[130px] text-right"
                {...cash}
              />
            }
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
