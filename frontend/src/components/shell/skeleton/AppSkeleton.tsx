import { LOOKUP_SCREEN } from '@/components/lookups-tabs/LookupButton'
import { AppShell } from '../AppShell'
import { SidebarSkeleton } from './SidebarSkeleton'
import { LookupSkeleton } from '@/components/lookups-tabs/LookupSkeleton'
import { EditorPanelSkeleton } from './EditorPanelSkeleton'
import type { EditorScreen } from '../Sidebar'

interface AppSkeletonProps {
  screen: EditorScreen | typeof LOOKUP_SCREEN
}

export function AppSkeleton({ screen }: AppSkeletonProps) {
  return (
    <AppShell
      topBarRight={
        <div
          aria-hidden="true"
          className="h-9 w-30 animate-pulse rounded-lg bg-primary-foreground/20"
        />
      }
      sidebar={<SidebarSkeleton />}
    >
      <div
        role="status"
        aria-label="Loading application"
        className="animate-pulse"
      >
        <div className="mb-6">
          <div className="h-7 w-48 rounded bg-muted" />
          <div className="mt-2 h-4 w-72 max-w-full rounded bg-muted" />
        </div>
        {screen === LOOKUP_SCREEN ? (
          <LookupSkeleton />
        ) : (
          <EditorPanelSkeleton />
        )}
      </div>
    </AppShell>
  )
}
