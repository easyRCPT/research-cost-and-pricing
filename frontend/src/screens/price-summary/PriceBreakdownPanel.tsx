import { Ledger, LedgerRow, Panel } from '@/components/shell'
import type { PriceSummary } from '@/types'
import { DASH, amount, percent } from './format'

interface PriceBreakdownPanelProps {
  summary: PriceSummary
  multiplier: number
  basis: number | undefined
}

export function PriceBreakdownPanel({
  summary,
  multiplier,
  basis,
}: PriceBreakdownPanelProps) {
  return (
    <Panel title="Price Summary" className="mt-4">
      <div className="overflow-x-auto">
        <Ledger>
          <thead>
            <tr className="border-b text-[12px] text-muted-foreground">
              <th className="py-1.5 text-left font-semibold" />
              <th className="w-[190px] py-1.5 text-right font-semibold">
                Full Project Cost (AUD)
              </th>
              <th className="w-[190px] py-1.5 text-right font-semibold">
                Price to be charged to Funder (AUD)
              </th>
            </tr>
          </thead>
          <tbody>
            <LedgerRow
              label="Indirect Cost Recovery multiplier (applied to salaries)"
              secondValue={basis === undefined ? DASH : basis.toFixed(2)}
              value={multiplier.toFixed(2)}
            />
            <LedgerRow
              label="Staff Costs (excluding in-kind)"
              secondValue={DASH}
              value={amount(summary.staff_cost)}
            />
            <LedgerRow
              label="Non-Staff Costs (excluding in-kind)"
              secondValue={amount(summary.non_staff_cost)}
              value={amount(summary.non_staff_cost)}
            />
            <LedgerRow
              tone="rule"
              label="Project Cost (excluding in-kind)"
              secondValue={DASH}
              value={amount(summary.project_cost)}
            />
            <LedgerRow
              label="In-kind (University investment) Staff Costs"
              secondValue={DASH}
              value={amount(summary.in_kind_staff_cost)}
            />
            <LedgerRow
              label="In-kind (University investment) Non-Staff Costs"
              secondValue={amount(summary.in_kind_non_staff_cost)}
              value={amount(summary.in_kind_non_staff_cost)}
            />
            <LedgerRow
              tone="rule"
              label="Total In-kind (University investment) Project Costs"
              secondValue={DASH}
              value={amount(summary.in_kind_project_cost)}
            />
            <LedgerRow
              label="Staff Costs % (excluding in-kind)"
              secondValue={DASH}
              value={percent(summary.staff_cost_percentage)}
            />
            <LedgerRow
              label="Non-Staff Costs % (excluding in-kind)"
              secondValue={DASH}
              value={percent(summary.non_staff_cost_percentage)}
            />
            <LedgerRow
              tone="rule"
              label="Total Project Cost (including in-kind)"
              secondValue={DASH}
              value={amount(summary.total_project_cost)}
            />
            <LedgerRow
              label="Total Price to be charged to Funder (Excluding GST)"
              secondValue=""
              value={amount(summary.total_price_exc_gst)}
            />
            <LedgerRow
              label="Total Price to be charged to Funder (Including GST)"
              secondValue=""
              value={amount(summary.total_price_inc_gst)}
            />
          </tbody>
        </Ledger>
      </div>
    </Panel>
  )
}
