import { Grid, Panel, Td, Th } from '@/components/shell'
import type { LookupTables } from '@/types'
import { CodeNameGrid } from './CodeNameGrid'

interface DeliverablesTabProps {
  deliverableTypes: LookupTables['deliverable_types']
  revenueCategories: LookupTables['revenue_categories']
}

export function DeliverablesTab({
  deliverableTypes,
  revenueCategories,
}: DeliverablesTabProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Panel title="Deliverable types">
        <CodeNameGrid label="Deliverable" rows={deliverableTypes} />
      </Panel>
      <Panel title="Revenue categories">
        <Grid>
          <thead>
            <tr>
              <Th>External party</Th>
              <Th>Description</Th>
              <Th align="right">Ledger ID</Th>
            </tr>
          </thead>
          <tbody>
            {revenueCategories.map((category) => (
              <tr key={category.budget_ledger_id}>
                <Td>{category.external_party}</Td>
                <Td>{category.description}</Td>
                <Td align="right" className="tabular">
                  {category.budget_ledger_id}
                </Td>
              </tr>
            ))}
          </tbody>
        </Grid>
      </Panel>
    </div>
  )
}
