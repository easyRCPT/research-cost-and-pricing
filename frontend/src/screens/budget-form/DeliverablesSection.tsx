import { Grid, PartBar, Td, Th } from '@/components/shell'
import { money } from '@/lib/format/utils'
import type { BudgetDetail } from '@/types'
import { DASH, or } from './format'

interface DeliverablesSectionProps {
  deliverables: BudgetDetail['budget_info']['deliverables']
}

export function DeliverablesSection({
  deliverables,
}: DeliverablesSectionProps) {
  return (
    <>
      <PartBar description="Must be completed for Grants. Record all technical and financial deliverables and invoicing dates.">
        PART J — Deliverables{' '}
        <span className="font-normal text-muted-foreground">
          optional for contracts
        </span>
      </PartBar>
      <Grid>
        <thead>
          <tr>
            <Th className="w-11" align="center">
              No.
            </Th>
            <Th>Description</Th>
            <Th>Type</Th>
            <Th align="right">Invoice Amount</Th>
            <Th>Due Date</Th>
            <Th>Dependency Sponsor</Th>
          </tr>
        </thead>
        <tbody>
          {deliverables.map((deliverable) => (
            <tr key={deliverable.number}>
              <Td align="center" className="text-muted-foreground">
                {deliverable.number}
              </Td>
              <Td>{or(deliverable.description)}</Td>
              <Td>{or(deliverable.deliverable_type)}</Td>
              <Td align="right" className="tabular">
                {deliverable.invoice_amount === null
                  ? DASH
                  : money(deliverable.invoice_amount)}
              </Td>
              <Td>{or(deliverable.due_date)}</Td>
              <Td>{or(deliverable.sponsor)}</Td>
            </tr>
          ))}
          {deliverables.length === 0 && (
            <tr>
              <Td
                colSpan={6}
                className="py-6 text-center text-muted-foreground"
              >
                No deliverables recorded.
              </Td>
            </tr>
          )}
        </tbody>
      </Grid>
    </>
  )
}
