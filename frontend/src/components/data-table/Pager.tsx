import { ArrowLeftIcon, ArrowRightIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { OptionSelect } from '@/components/ui/option-select'
import { cn } from '@/lib/utils'

const PAGE_SIZES = [10, 20, 50, 100]
const PAGE_SIZE_OPTIONS = PAGE_SIZES.map(String)

/** Slots the page list always fills, so its width never shifts between pages. */
const SLOTS = 7

/**
 * First and last page either side of a window on the current one, always
 * `SLOTS` entries wide, with unreachable stretches collapsed to a gap.
 */
function pageNumbers(current: number, count: number): (number | 'gap')[] {
  const run = (from: number, to: number) =>
    Array.from({ length: to - from + 1 }, (_, i) => from + i)

  if (count <= SLOTS) return run(1, count)
  if (current <= 4) return [...run(1, SLOTS - 2), 'gap', count]
  if (current >= count - 3) return [1, 'gap', ...run(count - SLOTS + 3, count)]
  return [1, 'gap', current - 1, current, current + 1, 'gap', count]
}

interface PagerProps {
  pageIndex: number
  pageSize: number
  total: number
  /** The count before search and filters, when they have narrowed it. */
  unfiltered?: number
  onPageIndex: (index: number) => void
  onPageSize: (size: number) => void
  noun?: [one: string, many: string]
  className?: string
}

export function Pager({
  pageIndex,
  pageSize,
  total,
  unfiltered = total,
  onPageIndex,
  onPageSize,
  noun = ['row', 'rows'],
  className,
}: PagerProps) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const paged = total > PAGE_SIZES[0]
  const first = pageIndex * pageSize + 1
  const last = Math.min(total, first + pageSize - 1)
  // Every slot is as wide as the longest page number, digits being tabular.
  const slot = { minWidth: `${String(pageCount).length + 1}ch` }

  return (
    <footer
      className={cn(
        'grid min-h-14 items-center gap-3 px-6 py-3 text-[13px] text-muted-foreground md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:gap-6',
        className,
      )}
    >
      <span className="tabular">
        {paged
          ? `Showing ${first}–${last} of ${total} ${noun[1]}`
          : `${total} ${total === 1 ? noun[0] : noun[1]}`}
        {total !== unfiltered && ` · filtered from ${unfiltered}`}
      </span>
      {paged && (
        <>
          <nav aria-label="Pagination" className="flex flex-wrap items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              disabled={pageIndex === 0}
              onClick={() => onPageIndex(pageIndex - 1)}
            >
              <ArrowLeftIcon data-icon="inline-start" />
              Previous
            </Button>
            {pageNumbers(pageIndex + 1, pageCount).map((page, index) =>
              page === 'gap' ? (
                <span
                  key={`gap-${index}`}
                  style={slot}
                  className="flex size-7 items-center justify-center"
                >
                  …
                </span>
              ) : (
                <Button
                  key={page}
                  variant={page === pageIndex + 1 ? 'default' : 'ghost'}
                  size="icon-sm"
                  aria-current={page === pageIndex + 1 ? 'page' : undefined}
                  style={slot}
                  className="tabular px-0"
                  onClick={() => onPageIndex(page - 1)}
                >
                  {page}
                </Button>
              ),
            )}
            <Button
              variant="ghost"
              size="sm"
              disabled={pageIndex >= pageCount - 1}
              onClick={() => onPageIndex(pageIndex + 1)}
            >
              Next
              <ArrowRightIcon data-icon="inline-end" />
            </Button>
          </nav>
          <label className="flex items-center justify-self-end gap-2">
            {noun[1].charAt(0).toUpperCase() + noun[1].slice(1)} per page
            <OptionSelect
              value={String(pageSize)}
              onValueChange={(value) => onPageSize(Number(value))}
              options={PAGE_SIZE_OPTIONS}
              size="sm"
              align="end"
              className="w-17 bg-card text-foreground"
            />
          </label>
        </>
      )}
    </footer>
  )
}
