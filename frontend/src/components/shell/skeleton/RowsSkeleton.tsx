import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

/** A stack of placeholder rows for a list that is still loading. */
export function RowsSkeleton({
  label,
  rows = 5,
  rowClassName = 'h-9',
  className,
}: {
  label: string
  rows?: number
  rowClassName?: string
  className?: string
}) {
  return (
    <div
      className={cn('space-y-3', className)}
      role="status"
      aria-label={label}
    >
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className={rowClassName} />
      ))}
    </div>
  )
}
