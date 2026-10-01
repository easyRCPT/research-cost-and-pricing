import type { ReactNode } from 'react'

import { Skeleton } from '@/components/ui/skeleton'

export function Stat({
  label,
  value,
  note,
}: {
  label: string
  value: number | undefined
  note: ReactNode
}) {
  return (
    <div className="rounded-lg border bg-card px-4 py-3.5">
      <p className="text-[12px] font-medium tracking-[0.06em] text-muted-foreground uppercase">
        {label}
      </p>
      {value === undefined ? (
        <Skeleton className="mt-1.5 h-7 w-14" />
      ) : (
        <p className="tabular mt-0.5 text-[26px] leading-tight font-bold text-primary">
          {value}
        </p>
      )}
      <p className="mt-0.5 min-h-[18px] text-[12px] text-muted-foreground">
        {note}
      </p>
    </div>
  )
}
