import { Suspense } from 'react'
import { QueryErrorResetBoundary, useQueryClient } from '@tanstack/react-query'
import { ErrorBoundary } from 'react-error-boundary'
import { useNavigate } from '@tanstack/react-router'
import { projectsQuery, useProjects } from '@/api/projects'
import { AppErrorState, AppShell, ProjectsSkeleton } from '@/components/shell'
import { ProjectsScreen } from '@/screens'

export function ProjectsRoute() {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary
          onReset={reset}
          fallbackRender={(props) => <AppErrorState {...props} />}
        >
          <Suspense fallback={<ProjectsSkeleton />}>
            {/*
              In the shell, without a sidebar: the branding band belongs on
              every screen, and ProjectsSkeleton already renders one -- so
              outside it the band flashed away as the list arrived.
            */}
            <AppShell>
              <Projects />
            </AppShell>
          </Suspense>
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  )
}

function Projects() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  useProjects()

  /**
   * The list opens a budget; the URL names a project.
   *
   * `ProjectsScreen` hands back the budget id its row was rendered from, so
   * the row is found again here to get the project it belongs to. #46 rewrites
   * this screen and should hand back the project id, at which point this goes.
   *
   * Read from the cache rather than from a rendered array: creating a project
   * opens it in the same breath, and the new row reaches the cache through the
   * mutation before it reaches this component through a render.
   */
  const open = (budgetId: number) => {
    const rows = queryClient.getQueryData(projectsQuery.queryKey) ?? []
    const project = rows.find((row) => row.budget_id === budgetId)
    if (!project) return
    navigate({
      to: '/projects/$projectId/$screen',
      params: { projectId: project.id, screen: 'details' },
    })
  }

  return <ProjectsScreen onOpen={open} />
}
