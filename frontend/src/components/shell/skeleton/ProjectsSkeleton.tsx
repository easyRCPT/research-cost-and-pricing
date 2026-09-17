import { AppShell } from '../AppShell'
import { PageHeadSkeleton } from './PageHeadSkeleton'

export function ProjectsSkeleton() {
  return (
    <AppShell>
      <div role="status" aria-label="Loading projects">
        <PageHeadSkeleton action />
        <div className="h-96 animate-pulse rounded-lg border bg-card" />
      </div>
    </AppShell>
  )
}
