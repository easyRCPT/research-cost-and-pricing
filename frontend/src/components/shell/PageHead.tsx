import type { ReactNode } from 'react'

interface PageHeadProps {
  title: string
  subtitle: string
  right?: ReactNode
}

export function PageHead({ title, subtitle, right }: PageHeadProps) {
  return (
    <div className="mb-6 flex flex-wrap items-center gap-4 print:hidden">
      <div>
        <h2 className="text-[22px] leading-tight font-bold tracking-tight text-primary">
          {title}
        </h2>
        <p className="mt-1 text-[13px] text-muted-foreground">{subtitle}</p>
      </div>
      {right && (
        <div className="ml-auto flex shrink-0 items-center gap-3">{right}</div>
      )}
    </div>
  )
}
