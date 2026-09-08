import type { RowData } from '@tanstack/react-table'
import type { DataTableFilter } from './features'

export type FilterState = Record<string, string[]>

export interface FilterOption {
  value: string
  /** Rows this value would leave, with the search and every other filter applied. */
  count: number
}

const collator = new Intl.Collator('en', { numeric: true })

function haystack<T extends RowData>(row: T, filters: DataTableFilter<T>[]) {
  const values = Object.values(row as object).filter(
    (v) => typeof v === 'string' || typeof v === 'number',
  )
  return [...values, ...filters.map((f) => f.value(row))]
    .join(' ')
    .toLowerCase()
}

/** Rows passing the search and every active filter, except `skip`. */
function narrow<T extends RowData>(
  rows: T[],
  filters: DataTableFilter<T>[],
  state: FilterState,
  search: string,
  skip?: string,
) {
  const q = search.trim().toLowerCase()
  const active = filters.filter(
    (f) => f.id !== skip && (state[f.id]?.length ?? 0) > 0,
  )
  return rows.filter(
    (row) =>
      (!q || haystack(row, filters).includes(q)) &&
      active.every((f) => state[f.id].includes(f.value(row))),
  )
}

export function applyFilters<T extends RowData>(
  rows: T[],
  filters: DataTableFilter<T>[],
  state: FilterState,
  search: string,
) {
  return narrow(rows, filters, state, search)
}

/** Every distinct value a filter can take, counted against the other filters. */
export function filterOptions<T extends RowData>(
  rows: T[],
  filters: DataTableFilter<T>[],
  filter: DataTableFilter<T>,
  state: FilterState,
  search: string,
): FilterOption[] {
  const counts = new Map<string, number>()
  for (const row of rows) counts.set(filter.value(row), 0)
  for (const row of narrow(rows, filters, state, search, filter.id)) {
    const value = filter.value(row)
    counts.set(value, (counts.get(value) ?? 0) + 1)
  }
  return [...counts]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => collator.compare(a.value, b.value))
}
