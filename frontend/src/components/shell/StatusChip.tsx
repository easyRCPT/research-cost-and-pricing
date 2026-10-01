import { Badge } from '@/components/ui/badge'
import { statusLabel } from '@/lib/status'
import { cn } from '@/lib/utils'
import type { Status } from '@/types'

const REVIEW =
  'bg-amber-100 text-amber-800 dark:bg-amber-400/15 dark:text-amber-300'

const TONES: Record<Status, string> = {
  draft: 'bg-muted text-muted-foreground',
  submitted: REVIEW,
  hod_review: REVIEW,
  dean_review: REVIEW,
  approved:
    'bg-emerald-100 text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-300',
  rejected: 'bg-destructive/10 text-destructive dark:bg-destructive/20',
  withdrawn: 'border-border bg-transparent text-muted-foreground',
}

/** A budget status as a coloured chip; every review stage shares one colour. */
export function StatusChip({ status }: { status: Status | null }) {
  if (status === null) {
    return <span className="text-muted-foreground">{statusLabel(status)}</span>
  }
  return (
    <Badge variant="secondary" className={cn('font-medium', TONES[status])}>
      {statusLabel(status)}
    </Badge>
  )
}
