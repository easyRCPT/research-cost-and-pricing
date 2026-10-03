import { useState } from 'react'

import { type Cursor, type CursorPage, useCursor } from '@/api/cursor'
import { useDebounced } from '@/lib/use-debounced'

import type { FilterOption, FilterState } from './filtering'

const SEARCH_DELAY_MS = 300

/** What a DataTable hands the server, and the page the server hands back. */
export interface DataTableRemote {
  /** Each filter's values, counted by the server: the page alone cannot count them. */
  options: Record<string, FilterOption[]>
  page: CursorPage<unknown>
  cursor: Cursor
  limit: number
  onLimit: (limit: number) => void
  onFilters: (state: FilterState) => void
  onSearch: (typed: string) => void
  /** A column id, `-` first for descending, or undefined for the server's order. */
  onSort: (ordering: string | undefined) => void
}

/**
 * The filters, search, sort and page of a table the server pages by cursor.
 * Any change but a page turn starts again from the first page.
 */
export function useRemote(pageSize = 50) {
  const cursor = useCursor()
  const [filters, setFilters] = useState<FilterState>({})
  const [q, setQ] = useState('')
  const [ordering, setOrdering] = useState<string>()
  const [limit, setLimit] = useState(pageSize)
  const settle = useDebounced((typed: string) => {
    setQ(typed.trim())
    cursor.reset()
  }, SEARCH_DELAY_MS)

  return {
    filters,
    /** The query parameters every paged endpoint shares, empty ones left out. */
    query: {
      q: q || undefined,
      ordering,
      limit,
      cursor: cursor.cursor ?? undefined,
    },
    remote: (
      page: CursorPage<unknown>,
      options: Record<string, FilterOption[]>,
    ): DataTableRemote => ({
      options,
      page,
      cursor,
      limit,
      onLimit: (next) => {
        setLimit(next)
        cursor.reset()
      },
      onFilters: (state) => {
        setFilters(state)
        cursor.reset()
      },
      onSearch: settle,
      onSort: (next) => {
        setOrdering(next)
        cursor.reset()
      },
    }),
  }
}
