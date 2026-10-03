import { useNavigate } from '@tanstack/react-router'

import { AppBoundary, AppShell, ProjectsSkeleton } from '@/components/shell'
import { ProjectsScreen } from '@/screens'

export function ProjectsRoute() {
  return (
    <AppBoundary fallback={<ProjectsSkeleton />}>
      {/*
        In the shell, without a sidebar: the branding band belongs on
        every screen, and ProjectsSkeleton already renders one -- so
        outside it the band flashed away as the list arrived.
      */}
      <AppShell>
        <Projects />
      </AppShell>
    </AppBoundary>
  )
}

function Projects() {
  const navigate = useNavigate()

  return (
    <ProjectsScreen
      onOpen={(projectId) =>
        navigate({
          to: '/projects/$projectId/$screen',
          params: { projectId, screen: 'details' },
        })
      }
    />
  )
}
