import {
  DataTable,
  TableCard,
  columnHelper,
  type DataTableFilter,
} from '@/components/data-table'
import type { LookupTables } from '@/types'

type Department = LookupTables['departments'][number]

const col = columnHelper<Department>()
const COLUMNS = col.columns([
  col.accessor('code', {
    header: 'Dept code',
    meta: { className: 'text-muted-foreground' },
  }),
  col.accessor('name', { header: 'Department' }),
  col.accessor('school', { header: 'School' }),
  col.accessor('faculty', { header: 'Faculty' }),
])

const FILTERS: DataTableFilter<Department>[] = [
  { id: 'department', label: 'Department', value: (row) => row.name },
  { id: 'school', label: 'School', value: (row) => row.school },
  { id: 'faculty', label: 'Faculty', value: (row) => row.faculty },
]

const byCode = (row: Department) => row.code

interface OrgUnitsTabProps {
  departments: LookupTables['departments']
}

export function OrgUnitsTab({ departments }: OrgUnitsTabProps) {
  return (
    <TableCard
      tables={[
        {
          value: 'orgunits',
          title: 'Org Units',
          table: (
            <DataTable
              columns={COLUMNS}
              rows={departments}
              getRowId={byCode}
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
