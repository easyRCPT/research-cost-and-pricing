import { DataTable, TableCard, columnHelper } from '@/components/data-table'
import type { LookupTables } from '@/types'

type Increase = LookupTables['eba_increases'][number]

const col = columnHelper<Increase>()
const COLUMNS = col.columns([
  col.accessor('year', { header: 'Year', meta: { className: 'tabular' } }),
  col.accessor('multiplier', {
    header: 'Multiplier',
    cell: ({ getValue }) => getValue().toFixed(4),
    meta: { align: 'right', className: 'tabular' },
  }),
])

const byYear = (row: Increase) => String(row.year)

interface EbaTabProps {
  increases: LookupTables['eba_increases']
}

export function EbaTab({ increases }: EbaTabProps) {
  return (
    <TableCard
      tables={[
        {
          value: 'increases',
          title: 'EBA increases by year',
          table: (
            <DataTable columns={COLUMNS} rows={increases} getRowId={byYear} />
          ),
        },
      ]}
    />
  )
}
