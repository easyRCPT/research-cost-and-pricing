import {
  DataTable,
  TableCard,
  columnHelper,
  type DataTableFilter,
} from '@/components/data-table'
import type { LookupTables } from '@/types'

type Category = LookupTables['non_staff_cost_categories'][number]

const col = columnHelper<Category>()
const COLUMNS = col.columns([
  col.accessor('cost_category', { header: 'Cost group' }),
  col.accessor('cost_subcategory', { header: 'Expense type' }),
  col.accessor('ledger_id', {
    header: 'Ledger ID',
    meta: { align: 'right', className: 'tabular' },
  }),
])

const FILTERS: DataTableFilter<Category>[] = [
  { id: 'group', label: 'Cost group', value: (row) => row.cost_category },
]

const byLedgerId = (row: Category) => String(row.ledger_id)

interface ExpensesTabProps {
  categories: LookupTables['non_staff_cost_categories']
}

export function ExpensesTab({ categories }: ExpensesTabProps) {
  return (
    <TableCard
      tables={[
        {
          value: 'expenses',
          title: 'Non-Staff Expense Types',
          table: (
            <DataTable
              columns={COLUMNS}
              rows={categories}
              getRowId={byLedgerId}
              sortable
              searchable
              filters={FILTERS}
            />
          ),
        },
      ]}
    />
  )
}
