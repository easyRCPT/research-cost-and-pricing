import type { RowData } from '@tanstack/react-table'
import { useMemo } from 'react'

import {
  DataTable,
  type DataTableColumns,
  type DataTableFilter,
} from '@/components/data-table'
import type { LookupTables } from '@/types'

export interface LookupTableDef<R extends RowData> {
  value: string
  title: string
  columns: DataTableColumns<R>
  rows: (lookups: LookupTables) => R[]
  getRowId: (row: R) => string
  sortable?: boolean
  searchable?: boolean
  filters?: DataTableFilter<R>[]
}

interface LookupDataTableProps<R extends RowData> {
  def: LookupTableDef<R>
  lookups: LookupTables
}

export function LookupDataTable<R extends RowData>({
  def: { columns, rows, getRowId, sortable, searchable, filters },
  lookups,
}: LookupDataTableProps<R>) {
  const data = useMemo(() => rows(lookups), [rows, lookups])
  return (
    <DataTable
      columns={columns}
      rows={data}
      getRowId={getRowId}
      sortable={sortable}
      searchable={searchable}
      filters={filters}
    />
  )
}
