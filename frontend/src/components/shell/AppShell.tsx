import type { ReactNode } from 'react'
import { TopBar } from './TopBar'

interface AppShellProps {
  topBarRight?: ReactNode
  sidebar: ReactNode
  children: ReactNode
}

export function AppShell({ topBarRight, sidebar, children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-background">
      <TopBar right={topBarRight} />
      <div className="grid md:grid-cols-[236px_minmax(0,1fr)]">
        {sidebar}
        <main className="w-full max-w-7xl px-8 py-7 pb-24">{children}</main>
      </div>
    </div>
  )
}
