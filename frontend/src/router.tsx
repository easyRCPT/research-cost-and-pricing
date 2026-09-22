import {
  Outlet,
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
} from '@tanstack/react-router'
import { LOOKUP_SCREEN } from '@/components/lookups-tabs/LookupButton'
import type { AppScreen } from '@/components/shell/AppContent'
import { SCREEN_HEADINGS } from '@/screens'
import { EditorRoute } from '@/routes/editor'
import { ProjectsRoute } from '@/routes/projects'

/**
 * Seven entries, written out rather than generated.
 *
 * The file-based generator wants a build step and a checked-in routeTree.gen.ts,
 * which is a lot of machinery for a tree that fits on a screen.
 */

/** Derived from the headings, so a restored screen needs no edit here. */
const isScreen = (value: string): value is AppScreen =>
  value === LOOKUP_SCREEN || value in SCREEN_HEADINGS

const rootRoute = createRootRoute({ component: Outlet })

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  // #44 makes this a redirect by group. Until there are groups, there is one
  // place to be.
  beforeLoad: () => {
    throw redirect({ to: '/projects' })
  },
})

const projectsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/projects',
  component: ProjectsRoute,
})

export const editorRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/projects/$projectId/$screen',
  params: {
    parse: ({ projectId, screen }) => ({
      projectId: Number(projectId),
      screen: screen as AppScreen,
    }),
    stringify: ({ projectId, screen }) => ({
      projectId: String(projectId),
      screen,
    }),
  },
  // A pasted or stale URL is the normal way an unknown screen arrives, so it
  // lands on the first screen rather than rendering blank. A project id that is
  // not a number never had a row behind it.
  beforeLoad: ({ params }) => {
    if (!Number.isInteger(params.projectId)) {
      throw redirect({ to: '/projects' })
    }
    if (!isScreen(params.screen)) {
      throw redirect({
        to: '/projects/$projectId/$screen',
        params: { projectId: params.projectId, screen: 'details' },
      })
    }
  },
  component: EditorRoute,
})

const catchAllRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '$',
  beforeLoad: () => {
    throw redirect({ to: '/projects' })
  },
})

const routeTree = rootRoute.addChildren([
  indexRoute,
  projectsRoute,
  editorRoute,
  catchAllRoute,
])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
