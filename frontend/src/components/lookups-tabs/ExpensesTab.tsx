import { Grid, Panel, Td, Th } from '@/components/shell'
import type { LookupTables } from '@/types'

interface ExpensesTabProps {
  categories: LookupTables['non_staff_cost_categories']
}

export function ExpensesTab({ categories }: ExpensesTabProps) {
  return (
    <Panel title="Non-Staff Expense Types">
      <Grid>
        <thead>
          <tr>
            <Th>Cost group</Th>
            <Th>Expense type</Th>
            <Th align="right">Ledger ID</Th>
          </tr>
        </thead>
        <tbody>
          {categories.map((category) => (
            <tr key={category.ledger_id}>
              <Td>{category.cost_category}</Td>
              <Td>{category.cost_subcategory}</Td>
              <Td align="right" className="tabular">
                {category.ledger_id}
              </Td>
            </tr>
          ))}
        </tbody>
      </Grid>
    </Panel>
  )
}
