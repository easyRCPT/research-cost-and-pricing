import type { ReactTable, RowData } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { DataTableFeatures } from './features'

const PAGE_SIZES = [10, 20, 50, 100]

interface DataTablePaginationProps<T extends RowData> {
  table: ReactTable<DataTableFeatures, T>
  total: number
}

export function DataTablePagination<T extends RowData>({
  table,
  total,
}: DataTablePaginationProps<T>) {
  const { pageIndex, pageSize } = table.state.pagination
  const pageCount = table.getPageCount()
  const paged = total > PAGE_SIZES[0]
  const first = pageIndex * pageSize + 1
  const last = Math.min(total, first + pageSize - 1)

  return (
    <footer className="flex min-h-14 items-center gap-6 px-6 py-3 text-[13px] text-muted-foreground">
      <span className="tabular">
        {paged ? `${first}–${last} of ${total} rows` : `${total} rows`}
      </span>
      {paged && (
        <>
          <label className="ml-auto flex items-center gap-2">
            Rows per page
            <Select
              value={String(pageSize)}
              onValueChange={(value) => table.setPageSize(Number(value))}
            >
              <SelectTrigger size="sm" className="w-17 text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                {PAGE_SIZES.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <span className="tabular">
            Page {pageIndex + 1} of {pageCount}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!table.getCanPreviousPage()}
              onClick={() => table.previousPage()}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!table.getCanNextPage()}
              onClick={() => table.nextPage()}
            >
              Next
            </Button>
          </div>
        </>
      )}
    </footer>
  )
}
