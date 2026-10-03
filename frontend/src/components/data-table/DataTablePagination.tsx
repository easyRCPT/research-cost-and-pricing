import type { ReactTable, RowData } from '@tanstack/react-table'

import type { DataTableFeatures } from './features'
import { Pager } from './Pager'

interface DataTablePaginationProps<T extends RowData> {
  table: ReactTable<DataTableFeatures, T>
  total: number
  unfiltered: number
}

export function DataTablePagination<T extends RowData>({
  table,
  total,
  unfiltered,
}: DataTablePaginationProps<T>) {
  const { pageIndex, pageSize } = table.state.pagination
  return (
    <Pager
      pageIndex={pageIndex}
      pageSize={pageSize}
      total={total}
      unfiltered={unfiltered}
      onPageIndex={table.setPageIndex}
      onPageSize={table.setPageSize}
    />
  )
}
