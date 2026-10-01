import {
  functionalUpdate,
  type RowData,
  type SortingState,
  useTable,
} from '@tanstack/react-table'
import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon } from 'lucide-react'
import {
  type ComponentProps,
  Fragment,
  type ReactNode,
  useMemo,
  useState,
} from 'react'

import { Td, Th } from '@/components/shell'
import { cn } from '@/lib/utils'

import { CursorPager } from './CursorPager'
import { DataTableColumnMenu } from './DataTableColumnMenu'
import { DataTablePagination } from './DataTablePagination'
import { DataTableToolbar } from './DataTableToolbar'
import {
  type DataTableColumns,
  dataTableFeatures,
  type DataTableFilter,
} from './features'
import { applyFilters, type FilterState } from './filtering'
import type { DataTableRemote } from './useRemote'

const NO_FILTERS: never[] = []
const UNSORTED: SortingState = []

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
  /** Drawn under an expanded row; a row it returns null for cannot expand. */
  detail?: (row: T) => ReactNode
  /** The server pages, sorts, searches and filters; `rows` is the page on screen. */
  remote?: DataTableRemote
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
  detail,
  remote,
}: DataTableProps<T>) {
  const [search, setSearch] = useState('')
  const [filterState, setFilterState] = useState<FilterState>({})
  const [sorting, setSorting] = useState(UNSORTED)

  const visible = useMemo(() => {
    if (remote) return rows
    const shown = applyFilters(rows, filters, filterState, search)
    if (!keep) return shown
    const passed = new Set(shown)
    return rows.filter((row) => passed.has(row) || keep(row))
  }, [rows, filters, filterState, search, keep, remote])

  const table = useTable({
    features: dataTableFeatures,
    columns,
    data: visible,
    getRowId,
    getRowCanExpand: (row) => detail?.(row.original) != null,
    enableSorting: sortable,
    manualPagination: !!remote,
    ...(remote && {
      manualSorting: true,
      enableMultiSort: false,
      state: { sorting },
      onSortingChange: (updater) => {
        const next = functionalUpdate(updater, sorting)
        setSorting(next)
        remote.onSort(
          next[0] && `${next[0].desc ? '-' : ''}${next[0].id}`,
        )
      },
    }),
    // An edit changes the rows too, and must not send the table back to page 1.
    autoResetPageIndex: false,
    initialState: { pagination: { pageIndex: 0, pageSize: 20 } },
  })

  const filtered = remote
    ? search.trim() !== '' ||
      Object.values(filterState).some((values) => values.length > 0)
    : rows.length > 0

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
              remote?.onSearch(value)
            }}
            state={filterState}
            options={remote?.options}
            onState={(state) => {
              setFilterState(state)
              table.setPageIndex(0)
              remote?.onFilters(state)
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
                  {filtered ? 'No rows match.' : emptyMessage}
                </Td>
              </tr>
            )}
            {table.getRowModel().rows.map((row) => (
              <Fragment key={row.id}>
                <tr {...rowProps?.(row.original)}>
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
                {row.getIsExpanded() && (
                  <tr>
                    <Td colSpan={row.getVisibleCells().length}>
                      {detail?.(row.original)}
                    </Td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      {remote ? (
        <CursorPager
          cursor={remote.cursor}
          page={remote.page}
          pageSize={remote.limit}
          onPageSize={remote.onLimit}
        />
      ) : (
        <DataTablePagination
          table={table}
          total={visible.length}
          unfiltered={rows.length}
        />
      )}
    </>
  )
}
