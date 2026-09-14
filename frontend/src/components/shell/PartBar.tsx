import type { ReactNode } from 'react'

export function PartBar({
  children,
  description,
}: {
  children: ReactNode
  description?: string
}) {
  return (
    <div className="mt-8 mb-4 rounded-md border bg-muted px-3 py-2 first:mt-0">
      <h3 className="text-[13.5px] font-semibold text-primary">{children}</h3>
      {description && (
        <p className="mt-0.5 max-w-[90ch] text-[12.5px] text-muted-foreground">
          {description}
        </p>
      )}
    </div>
  )
}
