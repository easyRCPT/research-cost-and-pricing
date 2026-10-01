import { ArrowLeftIcon, ArrowRightIcon } from 'lucide-react'

import type { Cursor, CursorPage } from '@/api/cursor'
import { Button } from '@/components/ui/button'
import { OptionSelect } from '@/components/ui/option-select'

const PAGE_SIZES = ['20', '50', '100']

interface CursorPagerProps {
  cursor: Cursor
  /** The page on screen, whose next link leads on. */
  page: CursorPage<unknown>
  pageSize: number
  onPageSize: (size: number) => void
}

/** Previous and Next over a cursor-paged list, which has no total to number pages by. */
export function CursorPager({
  cursor,
  page,
  pageSize,
  onPageSize,
}: CursorPagerProps) {
  return (
    <footer className="grid min-h-14 items-center gap-3 px-6 py-3 text-[13px] text-muted-foreground md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:gap-6">
      <span className="tabular">Page {cursor.page}</span>
      <nav aria-label="Pagination" className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          disabled={cursor.page === 1}
          onClick={cursor.previous}
        >
          <ArrowLeftIcon data-icon="inline-start" />
          Previous
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={!page.next}
          onClick={() => cursor.next(page)}
        >
          Next
          <ArrowRightIcon data-icon="inline-end" />
        </Button>
      </nav>
      <label className="flex items-center justify-self-end gap-2">
        Rows per page
        <OptionSelect
          value={String(pageSize)}
          onValueChange={(value) => onPageSize(Number(value))}
          options={PAGE_SIZES}
          size="sm"
          align="end"
          className="w-17 bg-card text-foreground"
        />
      </label>
    </footer>
  )
}
