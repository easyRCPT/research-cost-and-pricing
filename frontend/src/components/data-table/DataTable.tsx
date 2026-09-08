import { useTable, type RowData } from '@tanstack/react-table'
import { Td, Th } from '@/components/shell'
import { DataTablePagination } from './DataTablePagination'
import { dataTableFeatures, type DataTableColumns } from './features'

interface DataTableProps<T extends RowData> {
  columns: DataTableColumns<T>
  rows: T[]
  getRowId?: (row: T) => string
  pageSize?: number
}

export function DataTable<T extends RowData>({
  columns,
  rows,
  getRowId,
  pageSize = 20,
}: DataTableProps<T>) {
  const table = useTable({
    features: dataTableFeatures,
    columns,
    data: rows,
    getRowId,
    initialState: { pagination: { pageIndex: 0, pageSize } },
  })

  return (
    <>
      <div className="scroll-persist overflow-x-auto overscroll-x-contain px-6">
        <table className="grid-table w-max min-w-full text-[13px]">
          <thead>
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id}>
                {group.headers.map((header) => (
                  <Th
                    key={header.id}
                    align={header.column.columnDef.meta?.align}
                    className={header.column.columnDef.meta?.className}
                  >
                    {header.isPlaceholder ? null : (
                      <table.FlexRender header={header} />
                    )}
                  </Th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <Td
                  colSpan={columns.length}
                  className="py-6 text-center text-muted-foreground"
                >
                  No rows seeded yet.
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
      <DataTablePagination table={table} total={rows.length} />
    </>
  )
}
