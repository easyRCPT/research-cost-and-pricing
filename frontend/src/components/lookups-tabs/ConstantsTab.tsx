import { DataTable, TableCard, columnHelper } from '@/components/data-table'
import { money } from '@/lib/format/utils'
import type { LookupTables } from '@/types'

type Constant = LookupTables['calculation_constants'][number]
type Recovery = LookupTables['minimum_cost_recovery_multipliers'][number]

const percentage = (value: number) => `${(value * 100).toFixed(2)}%`

const CONSTANT_FORMAT: Record<string, (value: number) => string> = {
  gst_rate: percentage,
  max_leave_loading: money,
}

const constant = columnHelper<Constant>()
const CONSTANT_COLUMNS = constant.columns([
  constant.accessor('description', { header: 'Constant' }),
  constant.accessor('value', {
    header: 'Value',
    cell: ({ row, getValue }) =>
      (CONSTANT_FORMAT[row.original.name] ?? String)(getValue()),
    meta: { align: 'right', className: 'w-[180px] tabular' },
  }),
])

const recovery = columnHelper<Recovery>()
const RECOVERY_COLUMNS = recovery.columns([
  recovery.accessor('year', { header: 'Year', meta: { className: 'tabular' } }),
  recovery.accessor('multiplier', {
    header: 'Multiplier',
    cell: ({ getValue }) => getValue().toFixed(4),
    meta: { align: 'right', className: 'tabular' },
  }),
])

const byName = (row: Constant) => row.name
const byYear = (row: Recovery) => String(row.year)

interface ConstantsTabProps {
  data: LookupTables
}

export function ConstantsTab({ data }: ConstantsTabProps) {
  return (
    <TableCard
      tables={[
        {
          value: 'constants',
          title: 'All constants',
          table: (
            <DataTable
              columns={CONSTANT_COLUMNS}
              rows={data.calculation_constants}
              getRowId={byName}
            />
          ),
        },
        {
          value: 'recovery',
          title: 'Minimum cost recovery by year',
          table: (
            <DataTable
              columns={RECOVERY_COLUMNS}
              rows={data.minimum_cost_recovery_multipliers}
              getRowId={byYear}
            />
          ),
        },
      ]}
    />
  )
}
