import type { ReactNode } from 'react'

interface PanelProps {
  children: ReactNode
}

export function Panel({ children }: PanelProps) {
  return (
    <section className="rounded-lg border bg-card px-6 py-6 text-card-foreground">
      {children}
    </section>
  )
}
