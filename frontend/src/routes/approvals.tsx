import { Suspense } from 'react'
import { QueryErrorResetBoundary } from '@tanstack/react-query'
import { ErrorBoundary } from 'react-error-boundary'
import { AppErrorState, AppShell, ProjectsSkeleton } from '@/components/shell'
import { ApprovalQueue } from '@/screens/approval-queue/ApprovalQueue'

/**
 * The approver's queue. Open to any signed-in account: being staff is only
 * the door, and what fills the queue is an org assignment (#41), so a staff
 * account with none reaches the screen and correctly sees nothing waiting.
 */
export function ApprovalsRoute() {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary
          onReset={reset}
          fallbackRender={(props) => <AppErrorState {...props} />}
        >
          <Suspense fallback={<ProjectsSkeleton />}>
            <AppShell>
              <ApprovalQueue />
            </AppShell>
          </Suspense>
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  )
}
