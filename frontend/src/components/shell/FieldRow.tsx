import type { ReactNode } from 'react'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface FieldRowProps {
  label: string
  htmlFor?: string
  required?: boolean
  /** The field starts with its own column labels, so the row label drops to
   *  line up with the inputs rather than with those labels. */
  sublabelled?: boolean
  hint?: string
  children: ReactNode
}

export function FieldRow({
  label,
  htmlFor,
  required,
  sublabelled,
  hint,
  children,
}: FieldRowProps) {
  return (
    <div className="grid gap-2 py-2 first:pt-0 last:border-b-0 last:pb-0 md:grid-cols-[220px_minmax(0,1fr)] md:gap-6">
      <Label
        htmlFor={htmlFor}
        className={cn(
          'items-start leading-snug',
          sublabelled ? 'md:pt-7' : 'md:pt-2',
        )}
      >
        <div className="w-full flex md:justify-end">
          <span>
            {label}
            {required && <span className="text-destructive"> *</span>}
          </span>
        </div>
      </Label>
      <div>
        {children}
        {hint && <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>}
      </div>
    </div>
  )
}
