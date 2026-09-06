import { Suspense, useState } from 'react'
import { AppContent, type AppScreen } from '@/components/shell/AppContent'
import { QueryErrorResetBoundary } from '@tanstack/react-query'
import { ErrorBoundary } from 'react-error-boundary'
import { AppSkeleton } from './components/shell'

function App() {
  const [screen, setScreen] = useState<AppScreen>('details')

  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary
          onReset={reset}
          fallbackRender={(props) => <AppErrorState {...props} />}
        >
          <Suspense fallback={<AppSkeleton screen={screen} />}>
            <AppContent screen={screen} setScreen={setScreen} />
          </Suspense>
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  )
}

export default App
