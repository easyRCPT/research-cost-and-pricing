import { Ledger, LedgerRow, Panel } from '@/components/shell'
import { Badge } from '@/components/ui/badge'
import type { PriceSummary } from '@/types'
import { DASH, amount } from './format'

interface CayuseSummaryPanelProps {
  summary: PriceSummary
  multiplier: number
}

export function CayuseSummaryPanel({
  summary,
  multiplier,
}: CayuseSummaryPanelProps) {
  return (
    <Panel
      collapsible
      title={
        <>
          Cayuse summary
          <Badge variant="secondary" className="font-normal">
            read only
          </Badge>
        </>
      }
      hint="For the Cayuse Proposal Form, Financial Details section."
    >
      <div className="grid gap-x-10 gap-y-4 md:grid-cols-2">
        <Ledger>
          <tbody>
            <LedgerRow
              label="Currency Nominated for the project"
              value={<b>AUD</b>}
            />
            <LedgerRow
              label="Amount expected to be received by UoM"
              value={amount(summary.total_price_exc_gst)}
            />
            <LedgerRow
              label="Total Project Cost to UoM (including in-kind)"
              value={amount(summary.total_project_cost)}
            />
            <LedgerRow
              label="Cash co-contributions (university investment)"
              value={amount(summary.total_cash_co_contribution)}
            />
          </tbody>
        </Ledger>
        <Ledger>
          <tbody>
            <LedgerRow
              label="Total amount requested for project"
              value={amount(summary.total_price_inc_gst)}
            />
            <LedgerRow
              label="Cost recovery multiplier used"
              value={multiplier.toFixed(2)}
            />
            <LedgerRow
              label="Justification for cost recovery multiplier"
              value={DASH}
            />
          </tbody>
        </Ledger>
      </div>
    </Panel>
  )
}
