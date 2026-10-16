import { Ledger, LedgerRow, Panel } from '@/components/shell'
import { Badge } from '@/components/ui/badge'

export function CayuseSummaryPanel({ multiplier }: { multiplier: number }) {
  return (
    <Panel
      collapsible
      title={
        <>
          Cayuse details
          <Badge variant="secondary" className="font-normal">
            read only
          </Badge>
        </>
      }
      className="mt-4"
      hint="For the Cayuse Proposal Form, Financial Details section."
    >
      <Ledger>
        <tbody>
          <LedgerRow
            label="Currency nominated for the project"
            value={<b>AUD</b>}
          />
          <LedgerRow
            label="Salary cost recovery multiplier used"
            value={multiplier.toFixed(2)}
          />
        </tbody>
      </Ledger>
    </Panel>
  )
}
