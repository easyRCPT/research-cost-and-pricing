import { InAud, Ledger, LedgerRow, Money, PartBar } from '@/components/shell'
import { useCurrency } from '@/lib/format/currency'
import type { PriceSummary } from '@/types'

interface PriceSummarySectionProps {
  summary: PriceSummary
  gstApplicable: boolean
  /** The same figures in AUD, beside the price when it is in another currency (#152). */
  inAud: PriceSummary
}

export function PriceSummarySection({
  summary,
  gstApplicable,
  inAud,
}: PriceSummarySectionProps) {
  const foreign = useCurrency() !== 'AUD'
  const gst = summary.total_price_inc_gst - summary.total_price_exc_gst

  return (
    <>
      <PartBar>PART B — Price Summary</PartBar>
      <div className="grid gap-x-10 gap-y-4 md:grid-cols-2">
        <Ledger>
          <tbody>
            <LedgerRow
              label="Price Excluding GST"
              value={<Money value={summary.total_price_exc_gst} />}
            />
            {foreign && (
              <LedgerRow
                tone="sub"
                label="In AUD"
                value={<InAud value={inAud.total_price_exc_gst} />}
              />
            )}
            <LedgerRow
              label={
                <>
                  GST
                  <span className="ml-3 text-muted-foreground">
                    {gstApplicable ? 'Yes' : 'No'}
                  </span>
                </>
              }
              value={<Money value={gst} />}
            />
            <LedgerRow
              tone="rule"
              label="Total Price"
              value={<Money value={summary.total_price_inc_gst} />}
            />
            {foreign && (
              <LedgerRow
                tone="sub"
                label="In AUD"
                value={<InAud value={inAud.total_price_inc_gst} />}
              />
            )}
          </tbody>
        </Ledger>
        <Ledger>
          <tbody>
            <LedgerRow
              label="Full Project Cost (excluding in-kind)"
              value={<Money value={summary.project_cost} />}
            />
            <LedgerRow
              label="Cash benefit/cost"
              value={<Money value={summary.cash_benefit} />}
            />
            <LedgerRow
              label="Total In-kind (University investment)"
              value={<Money value={summary.total_in_kind_contribution} />}
            />
            <LedgerRow
              tone="rule"
              label="University Position"
              value={<Money value={summary.university_position} tone="sign" />}
            />
          </tbody>
        </Ledger>
      </div>
    </>
  )
}
