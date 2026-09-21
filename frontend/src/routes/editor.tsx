import { Suspense } from 'react'
import { QueryErrorResetBoundary } from '@tanstack/react-query'
import { ErrorBoundary } from 'react-error-boundary'
import { Navigate, useNavigate } from '@tanstack/react-router'
import { BudgetProvider } from '@/api/budget'
import { useProjects } from '@/api/projects'
import { AppErrorState, AppSkeleton } from '@/components/shell'
import { AppContent, type AppScreen } from '@/components/shell/AppContent'
import { editorRoute } from '@/router'

/**
 * The costing flow, addressed by project.
 *
 * The URL names a project while everything underneath names a budget, so the
 * id is turned over here, against the list the projects screen has already
 * loaded: a row carries its current budget, so arriving from the list costs
 * nothing and a cold load costs the one fetch it was always going to make.
 * #48 replaces this with the project detail endpoint.
 */
export function EditorRoute() {
  const { screen } = editorRoute.useParams()

  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary
          onReset={reset}
          fallbackRender={(props) => <AppErrorState {...props} />}
        >
          {/* Per-screen, so a deep link waits on the screen it asked for. */}
          <Suspense fallback={<AppSkeleton screen={screen} />}>
            <Editor />
          </Suspense>
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  )
}

function Editor() {
  const { projectId, screen } = editorRoute.useParams()
  const navigate = useNavigate()
  const { data: projects } = useProjects()
  const project = projects.find((row) => row.id === projectId)

  // A project nobody has, or one with no budget yet, is a kept or typed URL.
  // The list is where it came from and where it can be picked up again.
  if (!project || project.budget_id === null) {
    return <Navigate to="/projects" replace />
  }

  const setScreen = (next: AppScreen) =>
    navigate({
      to: '/projects/$projectId/$screen',
      params: { projectId, screen: next },
    })

  return (
    <BudgetProvider budgetId={project.budget_id}>
      <AppContent
        screen={screen}
        setScreen={setScreen}
        onLeave={() => navigate({ to: '/projects' })}
      />
    </BudgetProvider>
  )
}
