import {
  createColumnHelper,
  createPaginatedRowModel,
  rowPaginationFeature,
  tableFeatures,
  type ColumnDef,
  type RowData,
} from '@tanstack/react-table'

export interface DataTableColumnMeta {
  align?: 'left' | 'right'
  /** Applied to every cell in the column, head included. */
  className?: string
}

export const dataTableFeatures = tableFeatures({
  rowPaginationFeature,
  paginatedRowModel: createPaginatedRowModel(),
  columnMeta: {} as DataTableColumnMeta,
})

export type DataTableFeatures = typeof dataTableFeatures

// `any` is the value type the helper's `columns()` emits; each column keeps
// its own inferred value type inside.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DataTableColumns<T extends RowData> = ColumnDef<
  DataTableFeatures,
  T,
  any
>[]

export const columnHelper = <T extends RowData>() =>
  createColumnHelper<DataTableFeatures, T>()
