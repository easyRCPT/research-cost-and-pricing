import { DataTable, TableCard, columnHelper } from '@/components/data-table'
import type { LookupTables } from '@/types'
import { Alert, AlertDescription } from '@/components/ui/alert.tsx'

type Increase = LookupTables['eba_increases'][number]

const col = columnHelper<Increase>()
const COLUMNS = col.columns([
  col.accessor('year', { header: 'Year', meta: { className: 'tabular' } }),
  col.accessor('rate', {
    header: 'Rate',
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
    <div className="space-y-4">
      <Alert>
        <AlertDescription>
          Only the years when EBA rate changes are displayed. Years with the same
          rate are not included.
        </AlertDescription>
      </Alert>
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
    </div>
  )
}
