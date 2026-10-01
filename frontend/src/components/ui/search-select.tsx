import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { CheckIcon, ChevronDownIcon } from 'lucide-react'
import { useId, useState } from 'react'

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

/** Letters typed before anything is asked of the server. */
export const SEARCH_MIN_CHARS = 3
const SEARCH_DELAY_MS = 300

interface SearchSelectProps {
  value: SearchOption | null
  onChange: (option: SearchOption) => void
  /** What is being searched, so two lists never share a cached answer. */
  searchKey: string
  search: (q: string, signal: AbortSignal) => Promise<SearchOption[]>
  placeholder?: string
  size?: 'sm' | 'default'
  className?: string
  id?: string
  'aria-label'?: string
  'aria-invalid'?: boolean
}

/**
 * A picker for a list too long to scroll: nothing is fetched until
 * SEARCH_MIN_CHARS are typed, and the answer comes from the server.
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
  const settle = useDebounced(
    (typed: string) => setQuery(typed.trim()),
    SEARCH_DELAY_MS,
  )

  const typedEnough = draft.trim().length >= SEARCH_MIN_CHARS
  const { data, isPending } = useQuery({
    queryKey: ['search', searchKey, query],
    queryFn: ({ signal }) => search(query, signal),
    enabled: query.length >= SEARCH_MIN_CHARS,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  })
  const results = typedEnough ? (data ?? []) : []
  // Still waiting on the answer for what is now in the box.
  const waiting = typedEnough && (isPending || draft.trim() !== query)
  const current = Math.min(active, results.length - 1)

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
          placeholder={`Type ${SEARCH_MIN_CHARS} or more letters`}
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
              setActive(Math.min(current + 1, results.length - 1))
            } else if (event.key === 'ArrowUp' && results.length > 0) {
              event.preventDefault()
              setActive(Math.max(current - 1, 0))
            } else if (event.key === 'Enter' && results[current]) {
              event.preventDefault()
              pick(results[current])
            }
          }}
        />
        <div className="mt-2 max-h-64 overflow-y-auto">
          {!typedEnough && (
            <p className="px-2 py-3 text-[13px] text-muted-foreground">
              Start typing to search.
            </p>
          )}
          {waiting && results.length === 0 && (
            <RowsSkeleton label="Searching" rows={3} rowClassName="h-8" />
          )}
          {typedEnough && !waiting && results.length === 0 && (
            <p className="px-2 py-3 text-[13px] text-muted-foreground">
              No match for “{draft.trim()}”.
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
        </div>
      </PopoverContent>
    </Popover>
  )
}
