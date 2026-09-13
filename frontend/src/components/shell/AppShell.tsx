import type { ReactNode } from 'react'
import { TopBar } from './TopBar'

interface AppShellProps {
  topBarRight?: ReactNode
  sidebar: ReactNode
  children: ReactNode
}

export function AppShell({ topBarRight, sidebar, children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-background print:bg-white">
      <TopBar right={topBarRight} />
      <div className="grid md:grid-cols-[236px_minmax(0,1fr)] print:grid-cols-1">
        {sidebar}
        <main className="w-full min-w-0 max-w-7xl px-8 py-7 pb-24 print:max-w-none print:px-0 print:py-0">
          {children}
        </main>
      </div>
    </div>
  )
}
