import type { RowData } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import type { DataTableFilter } from './features'
import { filterOptions, type FilterState } from './filtering'

interface DataTableToolbarProps<T extends RowData> {
  rows: T[]
  filters: DataTableFilter<T>[]
  searchable: boolean
  search: string
  onSearch: (value: string) => void
  state: FilterState
  onState: (state: FilterState) => void
}

export function DataTableToolbar<T extends RowData>({
  rows,
  filters,
  searchable,
  search,
  onSearch,
  state,
  onState,
}: DataTableToolbarProps<T>) {
  const anyActive =
    search !== '' || filters.some((f) => (state[f.id]?.length ?? 0) > 0)

  const toggle = (id: string, value: string, checked: boolean) => {
    const current = state[id] ?? []
    onState({
      ...state,
      [id]: checked ? [...current, value] : current.filter((v) => v !== value),
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-2 px-6 pb-4">
      {searchable && (
        <Input
          type="search"
          placeholder="Search"
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          className="h-7 w-56 text-[13px]"
        />
      )}
      {filters.map((filter) => {
        const selected = state[filter.id] ?? []
        const options = filterOptions(rows, filters, filter, state, search)
        return (
          <DropdownMenu key={filter.id}>
            <DropdownMenuTrigger asChild>
              <Button
                variant={selected.length ? 'secondary' : 'outline'}
                size="sm"
              >
                {filter.label}
                {selected.length > 0 && (
                  <span className="font-normal text-muted-foreground">
                    {selected.length <= 2
                      ? selected.join(', ')
                      : `${selected.length} selected`}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="max-h-80 min-w-48 overflow-y-auto"
            >
              {options.map((option) => (
                <DropdownMenuCheckboxItem
                  key={option.value}
                  checked={selected.includes(option.value)}
                  disabled={
                    option.count === 0 && !selected.includes(option.value)
                  }
                  onCheckedChange={(checked) =>
                    toggle(filter.id, option.value, checked === true)
                  }
                  onSelect={(event) => event.preventDefault()}
                >
                  <span className="flex-1">{option.value}</span>
                  <span className="tabular text-muted-foreground">
                    ({option.count})
                  </span>
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      })}
      {anyActive && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            onSearch('')
            onState({})
          }}
        >
          Clear
        </Button>
      )}
    </div>
  )
}
