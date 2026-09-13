import type { RowData } from '@tanstack/react-table'
import { XIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DataTableFilterMenu } from './DataTableFilterMenu'
import type { DataTableFilter } from './features'
import { filterOptions, type FilterState } from './filtering'

/** Values named in a badge before the rest collapse to a count. */
const VALUES_SHOWN = 3

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
  const toggle = (id: string, value: string, checked: boolean) => {
    const current = state[id] ?? []
    onState({
      ...state,
      [id]: checked ? [...current, value] : current.filter((v) => v !== value),
    })
  }

  const active = filters
    .map((filter) => ({ filter, values: state[filter.id] ?? [] }))
    .filter(({ values }) => values.length > 0)

  return (
    <div className="flex flex-col gap-2 px-6 pb-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-nowrap items-center gap-1 overflow-x-auto">
          {filters.map((filter) => (
            <DataTableFilterMenu
              key={filter.id}
              label={filter.label}
              options={filterOptions(rows, filters, filter, state, search)}
              selected={state[filter.id] ?? []}
              onToggle={(value, checked) => toggle(filter.id, value, checked)}
              onSet={(values) => onState({ ...state, [filter.id]: values })}
            />
          ))}
        </div>
        {searchable && (
          <Input
            type="search"
            placeholder="Search"
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            className="h-7 w-56 bg-card text-[13px]"
          />
        )}
      </div>
      {active.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {active.map(({ filter, values }) => (
            <Badge
              key={filter.id}
              variant="secondary"
              className="h-6 max-w-full gap-1 bg-muted py-0 pr-1 pl-2 text-xs font-normal"
            >
              <span className="truncate">
                <span className="text-muted-foreground">{filter.label}: </span>
                {values.slice(0, VALUES_SHOWN).join(', ')}
              </span>
              {values.length > VALUES_SHOWN && (
                <span className="shrink-0 text-muted-foreground">
                  +{values.length - VALUES_SHOWN} more
                </span>
              )}
              <button
                type="button"
                aria-label={`Clear ${filter.label} filter`}
                onClick={() => onState({ ...state, [filter.id]: [] })}
                className="-mr-0.5 rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground"
              >
                <XIcon className="size-3" />
              </button>
            </Badge>
          ))}
          <Button
            variant="ghost"
            size="xs"
            className="text-muted-foreground"
            onClick={() => {
              onSearch('')
              onState({})
            }}
          >
            Clear
          </Button>
        </div>
      )}
    </div>
  )
}
