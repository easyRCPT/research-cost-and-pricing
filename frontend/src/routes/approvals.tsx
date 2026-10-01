import { QueryErrorResetBoundary } from '@tanstack/react-query'
import { type ReactNode,Suspense } from 'react'
import { ErrorBoundary } from 'react-error-boundary'

import { AppErrorState, AppShell, ProjectsSkeleton } from '@/components/shell'
import { ApprovalQueue } from '@/screens/approval-queue/ApprovalQueue'
import { ApprovalRegister } from '@/screens/approval-queue/ApprovalRegister'

/**
 * The approver's queue. Open to any signed-in account: being staff is only
 * the door, and what fills the queue is an org assignment (#41), so a staff
 * account with none reaches the screen and correctly sees nothing waiting.
 */
export function ApprovalsRoute() {
  return (
    <ApprovalsFrame>
      <ApprovalQueue />
    </ApprovalsFrame>
  )
}

/** Everything in the approver's area, decided or not (#98). */
export function ApprovalRegisterRoute() {
  return (
    <ApprovalsFrame>
      <ApprovalRegister />
    </ApprovalsFrame>
  )
}

function ApprovalsFrame({ children }: { children: ReactNode }) {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary
          onReset={reset}
          fallbackRender={(props) => <AppErrorState {...props} />}
        >
          <Suspense fallback={<ProjectsSkeleton />}>
            <AppShell>{children}</AppShell>
          </Suspense>
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  )
}
