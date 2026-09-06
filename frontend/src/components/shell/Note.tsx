import type { ReactNode } from 'react'

export function Note({ children }: { children: ReactNode }) {
  return (
    <p className="mt-2 max-w-[84ch] text-[12.5px] text-muted-foreground">
      {children}
    </p>
  )
}
