import { Suspense, useState } from 'react'
import { AppContent, type AppScreen } from '@/components/shell/AppContent'
import { QueryErrorResetBoundary } from '@tanstack/react-query'
import { ErrorBoundary } from 'react-error-boundary'
import { BudgetProvider } from '@/api/budget'
import {
  AppErrorState,
  AppShell,
  AppSkeleton,
  ProjectsSkeleton,
} from './components/shell'
import { ProjectsScreen } from './screens'

/**
 * Which half of the app is on screen, and for the costing flow, which budget.
 *
 * A switch rather than a router: neither view has a URL of its own yet, and the
 * costing flow already navigates itself through `screen`. Routing is worth
 * adding when a budget's id belongs in the address bar — when a costing can be
 * linked to, or reloaded onto the screen it was left on.
 */
type AppView = { name: 'projects' } | { name: 'editor'; budgetId: number }

function App() {
  const [view, setView] = useState<AppView>({ name: 'projects' })
  const [screen, setScreen] = useState<AppScreen>('details')

  const open = (budgetId: number) => {
    setScreen('details')
    setView({ name: 'editor', budgetId })
  }

  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary
          onReset={reset}
          fallbackRender={(props) => <AppErrorState {...props} />}
        >
          <Suspense
            fallback={
              view.name === 'projects' ? (
                <ProjectsSkeleton />
              ) : (
                <AppSkeleton screen={screen} />
              )
            }
          >
            {view.name === 'projects' ? (
              // In the shell, without a sidebar: the branding band belongs on
              // every screen, and ProjectsSkeleton already renders one -- so
              // outside it the band flashed away as the list arrived.
              <AppShell>
                <ProjectsScreen onOpen={open} />
              </AppShell>
            ) : (
              <BudgetProvider budgetId={view.budgetId}>
                <AppContent
                  screen={screen}
                  setScreen={setScreen}
                  onLeave={() => setView({ name: 'projects' })}
                />
              </BudgetProvider>
            )}
          </Suspense>
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  )
}

export default App
