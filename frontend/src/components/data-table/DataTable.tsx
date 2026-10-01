import { type RowData, useTable } from '@tanstack/react-table'
import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon } from 'lucide-react'
import { type ComponentProps, type ReactNode, useMemo, useState } from 'react'

import { Td, Th } from '@/components/shell'
import { cn } from '@/lib/utils'

import { DataTableColumnMenu } from './DataTableColumnMenu'
import { DataTablePagination } from './DataTablePagination'
import { DataTableToolbar } from './DataTableToolbar'
import {
  type DataTableColumns,
  dataTableFeatures,
  type DataTableFilter,
} from './features'
import { applyFilters, type FilterState } from './filtering'

const NO_FILTERS: never[] = []

interface DataTableProps<T extends RowData> {
  columns: DataTableColumns<T>
  rows: T[]
  getRowId?: (row: T) => string
  sortable?: boolean
  searchable?: boolean
  /** Adds a Columns menu beside the search for showing and hiding columns. */
  hideable?: boolean
  filters?: DataTableFilter<T>[]
  /** Shown when there is nothing to list at all, rather than nothing matching. */
  emptyMessage?: string
  /** Pads above the toolbar, for a table sitting straight in a card. */
  flush?: boolean
  /** Buttons for the whole table, such as Add row, beside the search. */
  actions?: ReactNode
  /** Rows shown whatever the search and filters say. */
  keep?: (row: T) => boolean
  rowProps?: (row: T) => ComponentProps<'tr'>
}

export function DataTable<T extends RowData>({
  columns,
  rows,
  getRowId,
  sortable = false,
  searchable = false,
  hideable = false,
  filters = NO_FILTERS,
  emptyMessage = 'No rows seeded yet.',
  flush = false,
  actions,
  keep,
  rowProps,
}: DataTableProps<T>) {
  const [search, setSearch] = useState('')
  const [filterState, setFilterState] = useState<FilterState>({})

  const visible = useMemo(() => {
    const shown = applyFilters(rows, filters, filterState, search)
    if (!keep) return shown
    const passed = new Set(shown)
    return rows.filter((row) => passed.has(row) || keep(row))
  }, [rows, filters, filterState, search, keep])

  const table = useTable({
    features: dataTableFeatures,
    columns,
    data: visible,
    getRowId,
    enableSorting: sortable,
    // An edit changes the rows too, and must not send the table back to page 1.
    autoResetPageIndex: false,
    initialState: { pagination: { pageIndex: 0, pageSize: 20 } },
  })

  return (
    <>
      {(searchable || hideable || filters.length > 0 || actions) && (
        <div className={cn(flush && 'pt-4')}>
          <DataTableToolbar
            rows={rows}
            filters={filters}
            searchable={searchable}
            search={search}
            onSearch={(value) => {
              setSearch(value)
              table.setPageIndex(0)
            }}
            state={filterState}
            onState={(state) => {
              setFilterState(state)
              table.setPageIndex(0)
            }}
            actions={
              <>
                {hideable && <DataTableColumnMenu table={table} />}
                {actions}
              </>
            }
          />
        </div>
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
                  colSpan={table.getVisibleLeafColumns().length}
                  className="py-6 text-center text-muted-foreground"
                >
                  {rows.length === 0 ? emptyMessage : 'No rows match.'}
                </Td>
              </tr>
            )}
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} {...rowProps?.(row.original)}>
                {row.getVisibleCells().map((cell) => (
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
