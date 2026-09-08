import { DataTable, TableCard, columnHelper } from '@/components/data-table'
import type { LookupTables } from '@/types'

type Increase = LookupTables['eba_increases'][number]
type IncrementCap = LookupTables['increment_caps'][number]

const increase = columnHelper<Increase>()
const INCREASE_COLUMNS = increase.columns([
  increase.accessor('year', { header: 'Year', meta: { className: 'tabular' } }),
  increase.accessor('multiplier', {
    header: 'Multiplier',
    cell: ({ getValue }) => getValue().toFixed(4),
    meta: { align: 'right', className: 'tabular' },
  }),
])

const cap = columnHelper<IncrementCap>()
const CAP_COLUMNS = cap.columns([
  cap.accessor('level', { header: 'Classification family' }),
  cap.accessor('max_steps', {
    header: 'Max. step',
    meta: { align: 'right', className: 'tabular' },
  }),
])

const byYear = (row: Increase) => String(row.year)
const byLevel = (row: IncrementCap) => row.level

interface EbaTabProps {
  increases: LookupTables['eba_increases']
  incrementCaps: LookupTables['increment_caps']
}

export function EbaTab({ increases, incrementCaps }: EbaTabProps) {
  return (
    <TableCard
      tables={[
        {
          value: 'increases',
          title: 'EBA increases by year',
          table: (
            <DataTable
              columns={INCREASE_COLUMNS}
              rows={increases}
              getRowId={byYear}
            />
          ),
        },
        {
          value: 'caps',
          title: 'Salary increment caps',
          table: (
            <DataTable
              columns={CAP_COLUMNS}
              rows={incrementCaps}
              getRowId={byLevel}
            />
          ),
        },
      ]}
    />
  )
}
