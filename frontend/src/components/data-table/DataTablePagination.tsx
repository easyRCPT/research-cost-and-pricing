import type { ReactTable, RowData } from '@tanstack/react-table'
import { ArrowLeftIcon, ArrowRightIcon } from 'lucide-react'
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

/** Slots the page list always fills, so its width never shifts between pages. */
const SLOTS = 7

/**
 * First and last page either side of a window on the current one, always
 * `SLOTS` entries wide, with unreachable stretches collapsed to a gap.
 */
function pageNumbers(current: number, count: number): (number | 'gap')[] {
  const run = (from: number, to: number) =>
    Array.from({ length: to - from + 1 }, (_, i) => from + i)

  if (count <= SLOTS) return run(1, count)
  if (current <= 4) return [...run(1, SLOTS - 2), 'gap', count]
  if (current >= count - 3) return [1, 'gap', ...run(count - SLOTS + 3, count)]
  return [1, 'gap', current - 1, current, current + 1, 'gap', count]
}

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
  const pageCount = table.getPageCount()
  const paged = total > PAGE_SIZES[0]
  const first = pageIndex * pageSize + 1
  const last = Math.min(total, first + pageSize - 1)
  // Every slot is as wide as the longest page number, digits being tabular.
  const slot = { minWidth: `${String(pageCount).length + 1}ch` }

  return (
    <footer className="grid min-h-14 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-6 px-6 py-3 text-[13px] text-muted-foreground">
      <span className="tabular">
        {paged ? `Showing ${first}–${last} of ${total} rows` : `${total} rows`}
        {total !== unfiltered && ` · filtered from ${unfiltered}`}
      </span>
      {paged && (
        <>
          <nav aria-label="Pagination" className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              disabled={!table.getCanPreviousPage()}
              onClick={() => table.previousPage()}
            >
              <ArrowLeftIcon data-icon="inline-start" />
              Previous
            </Button>
            {pageNumbers(pageIndex + 1, pageCount).map((page, index) =>
              page === 'gap' ? (
                <span
                  key={`gap-${index}`}
                  style={slot}
                  className="flex size-7 items-center justify-center"
                >
                  …
                </span>
              ) : (
                <Button
                  key={page}
                  variant={page === pageIndex + 1 ? 'default' : 'ghost'}
                  size="icon-sm"
                  aria-current={page === pageIndex + 1 ? 'page' : undefined}
                  style={slot}
                  className="tabular px-0"
                  onClick={() => table.setPageIndex(page - 1)}
                >
                  {page}
                </Button>
              ),
            )}
            <Button
              variant="ghost"
              size="sm"
              disabled={!table.getCanNextPage()}
              onClick={() => table.nextPage()}
            >
              Next
              <ArrowRightIcon data-icon="inline-end" />
            </Button>
          </nav>
          <label className="flex items-center justify-self-end gap-2">
            Rows per page
            <Select
              value={String(pageSize)}
              onValueChange={(value) => table.setPageSize(Number(value))}
            >
              <SelectTrigger size="sm" className="w-17 bg-card text-foreground">
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
        </>
      )}
    </footer>
  )
}
