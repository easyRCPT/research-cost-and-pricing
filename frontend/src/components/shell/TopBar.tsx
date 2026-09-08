import type { ReactNode } from 'react'

interface TopBarProps {
  right?: ReactNode
}

export function TopBar({ right }: TopBarProps) {
  return (
    <header className="sticky top-0 z-50 flex h-15 items-center gap-4 bg-primary px-6 text-primary-foreground print:hidden">
      <div>
        <h1 className="text-base leading-tight font-bold">
          Research Costing and Pricing Tool
        </h1>
        <p className="text-xs text-primary-foreground/65">
          Research, Innovation and Commercialisation
        </p>
      </div>
      <div className="flex-1" />
      {right}
    </header>
  )
}
