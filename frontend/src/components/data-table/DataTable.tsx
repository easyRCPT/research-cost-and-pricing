import { useMemo, useState } from 'react'
import { useTable, type RowData } from '@tanstack/react-table'
import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon } from 'lucide-react'
import { Td, Th } from '@/components/shell'
import { cn } from '@/lib/utils'
import { DataTablePagination } from './DataTablePagination'
import { DataTableToolbar } from './DataTableToolbar'
import {
  dataTableFeatures,
  type DataTableColumns,
  type DataTableFilter,
} from './features'
import { applyFilters, type FilterState } from './filtering'

const NO_FILTERS: never[] = []

interface DataTableProps<T extends RowData> {
  columns: DataTableColumns<T>
  rows: T[]
  getRowId?: (row: T) => string
  pageSize?: number
  sortable?: boolean
  searchable?: boolean
  filters?: DataTableFilter<T>[]
}

export function DataTable<T extends RowData>({
  columns,
  rows,
  getRowId,
  pageSize = 20,
  sortable = false,
  searchable = false,
  filters = NO_FILTERS,
}: DataTableProps<T>) {
  const [search, setSearch] = useState('')
  const [filterState, setFilterState] = useState<FilterState>({})

  const visible = useMemo(
    () => applyFilters(rows, filters, filterState, search),
    [rows, filters, filterState, search],
  )

  const table = useTable({
    features: dataTableFeatures,
    columns,
    data: visible,
    getRowId,
    enableSorting: sortable,
    initialState: { pagination: { pageIndex: 0, pageSize } },
  })

  return (
    <>
      {(searchable || filters.length > 0) && (
        <DataTableToolbar
          rows={rows}
          filters={filters}
          searchable={searchable}
          search={search}
          onSearch={setSearch}
          state={filterState}
          onState={setFilterState}
        />
      )}
      <div className="scroll-persist overflow-x-auto overscroll-x-none px-6">
        <table className="grid-table w-max min-w-full text-[13px]">
          <thead>
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id}>
                {group.headers.map((header) => {
                  const meta = header.column.columnDef.meta
                  const sorted = header.column.getIsSorted()
                  return (
                    <Th
                      key={header.id}
                      align={meta?.align}
                      className={meta?.className}
                    >
                      {header.isPlaceholder ? null : header.column.getCanSort() ? (
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className={cn(
                            'group/sort flex w-full cursor-pointer items-center gap-1 select-none',
                            meta?.align === 'right' && 'justify-end',
                          )}
                        >
                          <table.FlexRender header={header} />
                          {sorted === 'asc' ? (
                            <ArrowUpIcon className="size-3.5" />
                          ) : sorted === 'desc' ? (
                            <ArrowDownIcon className="size-3.5" />
                          ) : (
                            <ArrowUpDownIcon className="size-3.5 opacity-0 transition-opacity group-hover/sort:opacity-40" />
                          )}
                        </button>
                      ) : (
                        <table.FlexRender header={header} />
                      )}
                    </Th>
                  )
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr>
                <Td
                  colSpan={columns.length}
                  className="py-6 text-center text-muted-foreground"
                >
                  {rows.length === 0 ? 'No rows seeded yet.' : 'No rows match.'}
                </Td>
              </tr>
            )}
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id}>
                {row.getAllCells().map((cell) => (
                  <Td
                    key={cell.id}
                    align={cell.column.columnDef.meta?.align}
                    className={cell.column.columnDef.meta?.className}
                  >
                    <table.FlexRender cell={cell} />
                  </Td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <DataTablePagination
        table={table}
        total={visible.length}
        unfiltered={rows.length}
      />
    </>
  )
}
