import { InAud, Ledger, LedgerRow, Money, Panel } from '@/components/shell'
import { percent1 } from '@/lib/format/utils'
import type { BudgetInfo, PriceSummary } from '@/types'

interface PriceBreakdownPanelProps {
  summary: PriceSummary
  inAud: PriceSummary
  info: Pick<
    BudgetInfo,
    | 'currency'
    | 'exchange_rate'
    | 'exchange_rate_override'
    | 'gst_applicable'
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
  inAud,
  info,
}: PriceBreakdownPanelProps) {
  const foreign = info.currency !== 'AUD'
  const gst = summary.total_price_inc_gst - summary.total_price_exc_gst
  const inAudGst = inAud.total_price_inc_gst - inAud.total_price_exc_gst

  return (
    <Panel
      title="Cost and Price Summary"
      description={
        foreign
          ? `Amounts are shown in ${info.currency} at 1 AUD = ${info.exchange_rate} ${info.currency}${info.exchange_rate_override === null ? ', the rates table rate' : ', a rate set for this costing'}. In AUD figures are shown beneath the totals.`
          : undefined
      }
    >
      <p className="mb-4 text-[13px] text-muted-foreground">
        Margin is calculated on project costs excluding in-kind. Margin not
        applied to in-kind contributions.
      </p>

      <h4 className="mb-2 text-[13.5px] font-semibold text-primary">
        Full project cost
      </h4>
      <Ledger>
        <tbody>
          <LedgerRow
            label="Staff costs (excluding in-kind)"
            value={<Money value={summary.staff_cost} />}
          />
          <LedgerRow
            label="Non-staff costs (excluding in-kind)"
            value={<Money value={summary.non_staff_cost} />}
          />
          <LedgerRow
            tone="rule"
            label="Project costs subject to margin"
            value={<Money value={summary.project_cost} />}
          />
          <LedgerRow
            label="In-kind staff costs (margin not applied)"
            value={<Money value={summary.in_kind_staff_cost} />}
          />
          <LedgerRow
            label="In-kind non-staff costs (margin not applied)"
            value={<Money value={summary.in_kind_non_staff_cost} />}
          />
          <LedgerRow
            tone="sub"
            label="Total in-kind contribution (University investment)"
            value={<Money value={summary.total_in_kind_contribution} />}
          />
          <LedgerRow
            tone="rule"
            label="Full Project Cost (project costs + in-kind)"
            value={<Money value={summary.total_project_cost} />}
          />
          {foreign && (
            <LedgerRow
              tone="sub"
              label="In AUD"
              value={<InAud value={inAud.total_project_cost} />}
            />
          )}
        </tbody>
      </Ledger>

      <h4 className="mt-6 mb-2 text-[13.5px] font-semibold text-primary">
        Price requested from the funder
      </h4>
      <Ledger>
        <tbody>
          <LedgerRow
            label={
              <>
                Margin at {percent1(summary.margin)} on project costs excluding
                in-kind (<Money value={summary.project_cost} />)
              </>
            }
            value={<Money value={summary.margin_amount} />}
          />
          <LedgerRow
            tone="rule"
            label="Price excluding GST (eligible project costs + margin)"
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
            label={`GST (applicable: ${info.gst_applicable ? 'Yes' : 'No'})`}
            value={<Money value={gst} />}
          />
          {foreign && (
            <LedgerRow
              tone="sub"
              label="GST in AUD"
              value={<InAud value={inAudGst} />}
            />
          )}
          <LedgerRow
            tone="rule"
            label="Amount requested from funder (including GST)"
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

      <h4 className="mt-6 mb-2 text-[13.5px] font-semibold text-primary">
        University contribution and position
      </h4>
      <p className="mb-2 text-[13px] text-muted-foreground">
        Cash co-contributions are University funding and do not change the price
        requested from the funder.
      </p>
      <Ledger>
        <tbody>
          <LedgerRow
            label="Cash co-contribution (Department, Faculty and Chancellery)"
            value={<Money value={summary.total_cash_co_contribution} />}
          />
          <LedgerRow
            label="Cash benefit (price excluding GST less project costs excluding in-kind)"
            value={<Money value={summary.cash_benefit} />}
          />
          <LedgerRow
            tone="sub"
            label="Less in-kind contribution"
            value={<Money value={summary.total_in_kind_contribution} />}
          />
          <LedgerRow
            tone="sub"
            label="Less cash co-contribution"
            value={<Money value={summary.total_cash_co_contribution} />}
          />
          <LedgerRow
            tone="rule"
            label="University position (cash benefit less contributions)"
            value={<Money value={summary.university_position} tone="sign" />}
          />
        </tbody>
      </Ledger>
    </Panel>
  )
}
