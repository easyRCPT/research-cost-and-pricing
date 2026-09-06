import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface PanelProps {
  title?: string
  description?: string
  className?: string
  children: ReactNode
}

export function Panel({ title, description, className, children }: PanelProps) {
  return (
    <section
      className={cn(
        'rounded-lg border bg-card px-6 py-6 text-card-foreground',
        className,
      )}
    >
      {title && (
        <h3
          className={cn(
            'text-[15.5px] font-semibold text-primary',
            !description && 'mb-4',
          )}
        >
          {title}
        </h3>
      )}
      {description && (
        <p className="mt-0.5 mb-4 max-w-[80ch] text-[13px] text-muted-foreground">
          {description}
        </p>
      )}
      {children}
    </section>
  )
}
