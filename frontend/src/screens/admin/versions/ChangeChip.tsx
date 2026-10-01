import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

import type { ChangeLine } from './changeLines'

const CHIPS: Record<ChangeLine['op'], { label: string; tone: string }> = {
  create: {
    label: 'Added',
    tone: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-300',
  },
  update: {
    label: 'Updated',
    tone: 'bg-sky-100 text-sky-800 dark:bg-sky-400/15 dark:text-sky-300',
  },
  delete: {
    label: 'Removed',
    tone: 'bg-destructive/10 text-destructive dark:bg-destructive/20',
  },
}

/** What a change did to its row, a fixed width so a list of them scans down a column. */
export function ChangeChip({ op }: { op: ChangeLine['op'] }) {
  const { label, tone } = CHIPS[op]
  return (
    <Badge variant="secondary" className={cn('w-16 shrink-0', tone)}>
      {label}
    </Badge>
  )
}
