import { InAud, Ledger, LedgerRow, Money, Panel } from '@/components/shell'
import { percent1 } from '@/lib/format/utils'
import type { BudgetInfo, PriceSummary } from '@/types'

import { percent } from './format'

interface PriceBreakdownPanelProps {
  summary: PriceSummary
  multiplier: number
  gstApplicable: boolean
  /** The same figures in AUD, beside the price when it is in another currency (#152). */
  inAud: PriceSummary
  info: Pick<
    BudgetInfo,
    'currency' | 'exchange_rate' | 'exchange_rate_override'
  >
}

/**
 * One coherent account of cost and price (#213): the full project cost, the
 * University contributions, and the steps that turn the cost into the price
 * requested from the funder. The figures are the engine's own, so the display
 * explains the calculation rather than inventing one.
 */
export function PriceBreakdownPanel({
  summary,
  multiplier,
  gstApplicable,
  inAud,
  info,
}: PriceBreakdownPanelProps) {
  const foreign = info.currency !== 'AUD'
  const gst = summary.total_price_inc_gst - summary.total_price_exc_gst

  return (
    <Panel
      title="Cost and Price Summary"
      className="mt-4"
      description={
        foreign
          ? `Priced in ${info.currency} at 1 AUD = ${info.exchange_rate} ${info.currency}${info.exchange_rate_override === null ? ', the rates table rate' : ', a rate set for this costing'}. The price in AUD is shown beneath it.`
          : 'The full project cost, the University contributions, and the price requested from the funder.'
      }
    >
      <div className="overflow-x-auto">
        <Ledger>
          <tbody>
            <LedgerRow
              label="Cost recovery multiplier"
              value={multiplier.toFixed(2)}
            />
            <LedgerRow
              tone="rule"
              label="Full project cost (including in-kind)"
              value={<Money value={summary.total_project_cost} />}
            />
            <LedgerRow
              tone="sub"
              label="Project cost (excluding in-kind)"
              value={<Money value={summary.project_cost} />}
            />
            <LedgerRow
              tone="sub"
              label="In-kind contributions (University investment)"
              value={<Money value={summary.in_kind_project_cost} />}
            />
            <LedgerRow
              tone="sub"
              label="Staff costs % (excluding in-kind)"
              value={percent(summary.staff_cost_percentage)}
            />
            <LedgerRow
              tone="sub"
              label="Non-staff costs % (excluding in-kind)"
              value={percent(summary.non_staff_cost_percentage)}
            />
            <LedgerRow
              label={`Margin at ${percent1(summary.margin)} — not applied to in-kind contributions`}
              value={<Money value={summary.margin_amount} />}
            />
            <LedgerRow
              tone="rule"
              label="Price to be charged to the funder (excluding GST)"
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
              label="Price to be charged to the funder (including GST)"
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

        <h4 className="mt-6 mb-2 text-[13px] font-semibold">
          University contributions
        </h4>
        <Ledger>
          <tbody>
            <LedgerRow
              label="In-kind contributions (University investment)"
              value={<Money value={summary.total_in_kind_contribution} />}
            />
            <LedgerRow
              label="Cash co-contributions"
              value={<Money value={summary.total_cash_co_contribution} />}
            />
            <LedgerRow
              tone="rule"
              label="University position"
              value={<Money value={summary.university_position} tone="sign" />}
            />
          </tbody>
        </Ledger>
      </div>
    </Panel>
  )
}
