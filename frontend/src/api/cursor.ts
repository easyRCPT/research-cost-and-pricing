import { keepPreviousData } from '@tanstack/react-query'
import { useCallback, useState } from 'react'

/** One page of a list the server pages by cursor (DRF's CursorPagination). */
export interface CursorPage<T> {
  next?: string | null
  previous?: string | null
  results: T[]
}

/** The cursor a page's next or previous link carries, or null past either end. */
export function cursorOf(link: string | null | undefined) {
  return link ? new URL(link, location.origin).searchParams.get('cursor') : null
}

/**
 * Query options for one page. Only the first page gains rows, so a later one
 * is never asked for twice; the page on screen stays up while the next loads.
 */
export const pageOptions = (cursor: string | null | undefined) => ({
  staleTime: cursor ? Infinity : 0,
  placeholderData: keepPreviousData,
})

const FIRST: (string | null)[] = [null]

/**
 * Where a reader is in a cursor-paged list: the cursors walked to get here,
 * null for the first page. Going back pops one, so an earlier page comes
 * from the cache under the same key, and the page number is the stack's depth.
 * A list that grows as it scrolls reads every page in `cursors`.
 */
export function useCursor() {
  const [stack, setStack] = useState(FIRST)
  // Stable, so a page can watch its scroll without re-arming every render.
  const next = useCallback((page: CursorPage<unknown>) => {
    const cursor = cursorOf(page.next)
    // A scroll can ask twice before the first ask lands.
    if (cursor) setStack((s) => (s.includes(cursor) ? s : [...s, cursor]))
  }, [])
  const previous = useCallback(() => setStack((s) => s.slice(0, -1)), [])
  const reset = useCallback(() => setStack(FIRST), [])
  return {
    cursor: stack[stack.length - 1],
    cursors: stack,
    page: stack.length,
    next,
    previous,
    reset,
  }
}

export type Cursor = ReturnType<typeof useCursor>
