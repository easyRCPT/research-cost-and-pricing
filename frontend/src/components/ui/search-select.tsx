import { useQueries } from '@tanstack/react-query'
import { CheckIcon, ChevronDownIcon } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'

import { type CursorPage, pageOptions, useCursor } from '@/api/cursor'
import { RowsSkeleton } from '@/components/shell/skeleton/RowsSkeleton'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useDebounced } from '@/lib/use-debounced'
import { cn } from '@/lib/utils'

export interface SearchOption {
  value: string
  label: string
  /** A second, quieter line, such as the faculty a department sits in. */
  hint?: string
}

const SEARCH_DELAY_MS = 300

interface SearchSelectProps {
  value: SearchOption | null
  onChange: (option: SearchOption) => void
  /** What is being searched, so two lists never share a cached answer. */
  searchKey: string
  search: (
    q: string,
    cursor: string | null,
    signal: AbortSignal,
  ) => Promise<CursorPage<SearchOption>>
  placeholder?: string
  size?: 'sm' | 'default'
  className?: string
  id?: string
  'aria-label'?: string
  'aria-invalid'?: boolean
}

/**
 * A picker for a list too long to load whole: the server sends it a page at a
 * time as it scrolls, and typing narrows it there.
 */
export function SearchSelect({
  value,
  onChange,
  searchKey,
  search,
  placeholder = 'Search…',
  size = 'default',
  className,
  id,
  'aria-label': ariaLabel,
  'aria-invalid': ariaInvalid,
}: SearchSelectProps) {
  const listId = useId()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const cursor = useCursor()
  const { next } = cursor
  const scroller = useRef<HTMLDivElement>(null)
  const sentinel = useRef<HTMLDivElement>(null)
  const settle = useDebounced((typed: string) => {
    setQuery(typed.trim())
    cursor.reset()
  }, SEARCH_DELAY_MS)

  const pages = useQueries({
    queries: cursor.cursors.map((at) => ({
      queryKey: ['search', searchKey, query, at],
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        search(query, at, signal),
      enabled: open,
      ...pageOptions(at),
    })),
  })
  const results = pages.flatMap((page) => page.data?.results ?? [])
  const last = pages[pages.length - 1]
  // Not while the last search's page stands in: its link leads through that search.
  const more = last.data?.next && !last.isPlaceholderData ? last.data : null
  // Still waiting on the answer for what is now in the box.
  const waiting = pages[0].isPending || draft.trim() !== query
  const loadingMore = pages.length > 1 && last.isPending
  const current = Math.min(active, results.length - 1)

  // A fresh observer reports at once, so a short list that leaves the
  // sentinel in view keeps asking until it fills the box or runs out.
  useEffect(() => {
    if (!open || !more || !sentinel.current) return
    const observer = new IntersectionObserver(
      ([entry]) => entry.isIntersecting && next(more),
      { root: scroller.current },
    )
    observer.observe(sentinel.current)
    return () => observer.disconnect()
  }, [open, more, next])

  const move = (index: number) => {
    setActive(index)
    document
      .getElementById(`${listId}-${index}`)
      ?.scrollIntoView({ block: 'nearest' })
    if (index === results.length - 1 && more) cursor.next(more)
  }

  const pick = (option: SearchOption) => {
    onChange(option)
    setOpen(false)
  }

  const reset = (next: boolean) => {
    setOpen(next)
    if (!next) {
      setDraft('')
      setQuery('')
      setActive(0)
      cursor.reset()
    }
  }

  return (
    <Popover open={open} onOpenChange={reset}>
      <PopoverTrigger asChild>
        <button
          type="button"
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-label={ariaLabel}
          aria-invalid={ariaInvalid}
          className={cn(
            'flex w-full items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent py-2 pr-2 pl-2.5 text-left text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20',
            size === 'sm' ? 'h-7' : 'h-8',
            !value && 'text-muted-foreground',
            className,
          )}
        >
          <span className="line-clamp-1">{value?.label ?? placeholder}</span>
          <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-(--radix-popover-trigger-width) min-w-72 p-2"
      >
        <Input
          autoFocus
          value={draft}
          placeholder="Search by name or code"
          aria-label="Search"
          role="combobox"
          aria-expanded
          aria-controls={listId}
          aria-activedescendant={
            results[current] ? `${listId}-${current}` : undefined
          }
          className="h-8"
          onChange={(event) => {
            setDraft(event.target.value)
            setActive(0)
            settle(event.target.value)
          }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown' && results.length > 0) {
              event.preventDefault()
              move(Math.min(current + 1, results.length - 1))
            } else if (event.key === 'ArrowUp' && results.length > 0) {
              event.preventDefault()
              move(Math.max(current - 1, 0))
            } else if (event.key === 'Enter' && results[current]) {
              event.preventDefault()
              pick(results[current])
            }
          }}
        />
        <div ref={scroller} className="mt-2 max-h-64 overflow-y-auto">
          {waiting && results.length === 0 && (
            <RowsSkeleton label="Searching" rows={3} rowClassName="h-8" />
          )}
          {!waiting && results.length === 0 && (
            <p className="px-2 py-3 text-[13px] text-muted-foreground">
              {query ? `No match for “${query}”.` : 'Nothing to pick from.'}
            </p>
          )}
          <ul
            id={listId}
            role="listbox"
            className={cn(waiting && 'opacity-60')}
          >
            {results.map((option, index) => (
              <li
                key={option.value}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={option.value === value?.value}
                data-active={index === current || undefined}
                className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-sm data-active:bg-muted"
                onMouseMove={() => setActive(index)}
                onClick={() => pick(option)}
              >
                <span className="min-w-0 flex-1">
                  <span className="block">{option.label}</span>
                  {option.hint && (
                    <span className="block text-[12px] text-muted-foreground">
                      {option.hint}
                    </span>
                  )}
                </span>
                {option.value === value?.value && (
                  <CheckIcon className="mt-0.5 size-4 shrink-0" />
                )}
              </li>
            ))}
          </ul>
          {loadingMore && (
            <RowsSkeleton
              label="Loading more"
              rows={1}
              rowClassName="h-8"
              className="mt-1"
            />
          )}
          <div ref={sentinel} className="h-px" />
        </div>
      </PopoverContent>
    </Popover>
  )
}
