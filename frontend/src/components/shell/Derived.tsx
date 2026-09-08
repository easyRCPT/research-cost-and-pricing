import { useCalculating } from '@/api/budget-lines'
import type { ReactNode } from 'react'

export function Derived({ children }: { children: ReactNode }) {
  const calculating = useCalculating()

  return (
    <span className="relative">
      {children}
      {calculating} && (
      <span
        aria-hidden
        className="absolute inset-0 animate-in fade-in delay-150 fill-mode-both"
      >
        <span className="block h-full w-full animate-pulse rounded bg-muted" />
      </span>
      )
    </span>
  )
}
