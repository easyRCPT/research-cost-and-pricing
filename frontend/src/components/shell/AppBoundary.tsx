import { QueryErrorResetBoundary } from '@tanstack/react-query'
import { type ReactNode, Suspense } from 'react'
import { ErrorBoundary } from 'react-error-boundary'

import { AppErrorState } from './AppErrorState'

/** Shows `fallback` while the children load and an error state with a retry if they fail. */
export function AppBoundary({
  fallback,
  children,
}: {
  fallback: ReactNode
  children: ReactNode
}) {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary
          onReset={reset}
          fallbackRender={(props) => <AppErrorState {...props} />}
        >
          <Suspense fallback={fallback}>{children}</Suspense>
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  )
}
