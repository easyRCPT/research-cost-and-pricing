import { Navigate, useNavigate } from '@tanstack/react-router'

import { BudgetProvider } from '@/api/budget'
import { useProject } from '@/api/projects'
import { AppBoundary, AppSkeleton } from '@/components/shell'
import { editorRoute } from '@/router'
import { AppContent, type AppScreen } from '@/screens/editor/AppContent'

/**
 * The costing flow, addressed by project. The URL names a project while
 * everything underneath names a budget, so the project's row is read here for
 * its current budget.
 */
export function EditorRoute() {
  const { screen } = editorRoute.useParams()

  return (
    // Per-screen, so a deep link waits on the screen it asked for.
    <AppBoundary fallback={<AppSkeleton screen={screen} />}>
      <Editor />
    </AppBoundary>
  )
}

function Editor() {
  const { projectId, screen } = editorRoute.useParams()
  const navigate = useNavigate()
  const { data: project } = useProject(projectId)

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
