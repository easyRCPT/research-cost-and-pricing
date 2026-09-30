import { DataTable, TableCard, columnHelper } from '@/components/data-table'
import { money } from '@/lib/format/utils'
import type { LookupTables } from '@/types'

type Constant = LookupTables['calculation_constants'][number]

const percentage = (value: number) => `${(value * 100).toFixed(2)}%`

const CONSTANT_FORMAT: Record<string, (value: number) => string> = {
  gst_rate: percentage,
  max_leave_loading: money,
}

const UPPERCASE_WORDS = new Set(['uom', 'gst', 'eba'])

const formatName = (name: string) =>
  name
    .split('_')
    .map((word) =>
      UPPERCASE_WORDS.has(word) ? word.toUpperCase() : word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join(' ')

const constant = columnHelper<Constant>()
const CONSTANT_COLUMNS = constant.columns([
  // TODO: `name` is not editable via the API, but it should still be displayed.
  // `description` alone is ambiguous and hard to read.
  // The frontend must also block editing `name`.
  constant.accessor('name', {
    header: 'Constant',
    cell: ({ getValue }) => formatName(getValue()),
  }),
  constant.accessor('description', { header: 'Description' }),
  constant.accessor('value', {
    header: 'Value',
    cell: ({ row, getValue }) =>
      (CONSTANT_FORMAT[row.original.name] ?? String)(getValue()),
    meta: { align: 'right', className: 'w-[180px] tabular' },
  }),
])

const byName = (row: Constant) => row.name

interface ConstantsTabProps {
  data: LookupTables
}

/**
 * The "Minimum cost recovery by year" table is gone with its model: it was
 * served over /api/lookups/, had no rows in any environment, and nothing read
 * it. The dean rule reads the minimum_margin constant, which is in the table
 * above.
 */
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
      ]}
    />
  )
}
