import { Ledger, LedgerRow, PartBar } from '@/components/shell'
import { money } from '@/lib/format/utils'
import type { PriceSummary } from '@/types'

interface PriceSummarySectionProps {
  summary: PriceSummary
  gstApplicable: boolean
}

export function PriceSummarySection({
  summary,
  gstApplicable,
}: PriceSummarySectionProps) {
  const gst = summary.total_price_inc_gst - summary.total_price_exc_gst

  return (
    <>
      <PartBar>PART B — Price Summary</PartBar>
      <div className="grid gap-x-10 gap-y-4 md:grid-cols-2">
        <Ledger>
          <tbody>
            <LedgerRow
              label="Price Excluding GST"
              value={money(summary.total_price_exc_gst)}
            />
            <LedgerRow
              label={
                <>
                  GST
                  <span className="ml-3 text-muted-foreground">
                    {gstApplicable ? 'Yes' : 'No'}
                  </span>
                </>
              }
              value={money(gst)}
            />
            <LedgerRow
              tone="rule"
              label="Total Price"
              value={money(summary.total_price_inc_gst)}
            />
          </tbody>
        </Ledger>
        <Ledger>
          <tbody>
            <LedgerRow
              label="Full Project Cost (excluding in-kind)"
              value={money(summary.project_cost)}
            />
            <LedgerRow
              label="Cash benefit/cost"
              value={money(summary.cash_benefit)}
            />
            <LedgerRow
              label="Total In-kind (University investment)"
              value={money(summary.total_in_kind_contribution)}
            />
            <LedgerRow
              tone="rule"
              label="University Position"
              value={
                <span
                  className={
                    summary.university_position < 0 ? 'text-bad' : 'text-good'
                  }
                >
                  {money(summary.university_position)}
                </span>
              }
            />
          </tbody>
        </Ledger>
      </div>
    </>
  )
}
