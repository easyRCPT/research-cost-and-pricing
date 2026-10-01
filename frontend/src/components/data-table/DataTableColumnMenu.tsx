import type { ReactTable, RowData } from '@tanstack/react-table'
import { Columns3Icon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

import { MenuCheckbox } from './DataTableFilterMenu'
import type { DataTableFeatures } from './features'

/** Shows or hides the table's columns; a column opts out with `enableHiding: false`. */
export function DataTableColumnMenu<T extends RowData>({
  table,
}: {
  table: ReactTable<DataTableFeatures, T>
}) {
  const columns = table
    .getAllLeafColumns()
    .filter((column) => column.getCanHide())
  const hidden = columns.filter((column) => !column.getIsVisible()).length

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="bg-card font-normal">
          <Columns3Icon data-icon="inline-start" />
          Columns
          {hidden > 0 && (
            <span className="tabular text-muted-foreground">
              ({hidden} hidden)
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto min-w-48 p-1">
        {columns.map((column) => (
          <MenuCheckbox
            key={column.id}
            checked={column.getIsVisible()}
            onToggle={() => column.toggleVisibility()}
          >
            <span className="flex-1 truncate">
              {typeof column.columnDef.header === 'string'
                ? column.columnDef.header
                : column.id}
            </span>
          </MenuCheckbox>
        ))}
      </PopoverContent>
    </Popover>
  )
}
