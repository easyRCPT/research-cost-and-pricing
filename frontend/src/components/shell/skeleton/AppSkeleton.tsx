import { LOOKUP_SCREEN } from '@/components/lookups-tabs/LookupButton'
import { LookupSkeleton } from '@/components/lookups-tabs/LookupSkeleton'
import { AppShell } from '@/components/shell/AppShell'
import type { EditorScreen } from '@/components/shell/Sidebar'

import { EditorPanelSkeleton } from './EditorPanelSkeleton'
import { PageHeadSkeleton } from './PageHeadSkeleton'
import { SidebarSkeleton } from './SidebarSkeleton'

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
      <div role="status" aria-label="Loading application">
        <PageHeadSkeleton action={screen === 'budget'} />
        {screen === LOOKUP_SCREEN ? (
          <LookupSkeleton />
        ) : (
          <EditorPanelSkeleton />
        )}
      </div>
    </AppShell>
  )
}
