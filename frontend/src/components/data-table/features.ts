import {
  type ColumnDef,
  columnVisibilityFeature,
  createColumnHelper,
  createPaginatedRowModel,
  createSortedRowModel,
  type RowData,
  rowPaginationFeature,
  rowSortingFeature,
  tableFeatures,
} from '@tanstack/react-table'

export interface DataTableColumnMeta {
  align?: 'left' | 'right'
  /** Applied to every cell in the column, head included. */
  className?: string
}

export const dataTableFeatures = tableFeatures({
  columnVisibilityFeature,
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  rowPaginationFeature,
  paginatedRowModel: createPaginatedRowModel(),
  columnMeta: {} as DataTableColumnMeta,
})

export type DataTableFeatures = typeof dataTableFeatures

// `any` is the value type the helper's `columns()` emits; each column keeps
// its own inferred value type inside.
export type DataTableColumns<T extends RowData> = ColumnDef<
  DataTableFeatures,
  T,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  any
>[]

export const columnHelper = <T extends RowData>() =>
  createColumnHelper<DataTableFeatures, T>()

/** A categorical filter: one dropdown of the distinct values `value` yields. */
export interface DataTableFilter<T extends RowData> {
  id: string
  label: string
  value: (row: T) => string
  /**
   * A date range rather than a list of values. `value` is then the row's day
   * as YYYY-MM-DD, and the filter's state is its first and last day, either
   * empty for open.
   */
  range?: boolean
}
