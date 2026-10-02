import { ArrowLeftIcon, ArrowRightIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'

export function UsersPager({
  page,
  pageSize,
  total,
  onPage,
}: {
  page: number
  pageSize: number
  total: number
  onPage: (page: number) => void
}) {
  const last = Math.ceil(total / pageSize) - 1
  const from = page * pageSize + 1
  const to = Math.min(total, from + pageSize - 1)

  return (
    <nav
      aria-label="Accounts pages"
      className="flex items-center justify-between gap-2 border-t px-2 py-2 text-[12.5px] text-muted-foreground"
    >
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Previous page"
        disabled={page === 0}
        onClick={() => onPage(page - 1)}
      >
        <ArrowLeftIcon />
      </Button>
      <span className="tabular">
        {from}–{to} of {total}
      </span>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Next page"
        disabled={page >= last}
        onClick={() => onPage(page + 1)}
      >
        <ArrowRightIcon />
      </Button>
    </nav>
  )
}
