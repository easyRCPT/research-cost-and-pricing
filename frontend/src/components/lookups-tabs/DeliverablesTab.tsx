import { DataTable, TableCard, columnHelper } from '@/components/data-table'
import type { LookupTables } from '@/types'
import { byCode, codeNameColumns } from './code-name-columns'

type RevenueCategory = LookupTables['revenue_categories'][number]

const DELIVERABLE_COLUMNS = codeNameColumns('Deliverable')

const col = columnHelper<RevenueCategory>()
const REVENUE_COLUMNS = col.columns([
  col.accessor('external_party', { header: 'External party' }),
  col.accessor('description', { header: 'Description' }),
  col.accessor('budget_ledger_id', {
    header: 'Ledger ID',
    meta: { align: 'right', className: 'tabular' },
  }),
])

const byLedgerId = (row: RevenueCategory) => String(row.budget_ledger_id)

interface DeliverablesTabProps {
  deliverableTypes: LookupTables['deliverable_types']
  revenueCategories: LookupTables['revenue_categories']
}

export function DeliverablesTab({
  deliverableTypes,
  revenueCategories,
}: DeliverablesTabProps) {
  return (
    <TableCard
      tables={[
        {
          value: 'deliverables',
          title: 'Deliverable types',
          table: (
            <DataTable
              columns={DELIVERABLE_COLUMNS}
              rows={deliverableTypes}
              getRowId={byCode}
            />
          ),
        },
        {
          value: 'revenue',
          title: 'Revenue categories',
          table: (
            <DataTable
              columns={REVENUE_COLUMNS}
              rows={revenueCategories}
              getRowId={byLedgerId}
            />
          ),
        },
      ]}
    />
  )
}
