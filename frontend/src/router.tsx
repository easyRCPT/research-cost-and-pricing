import type { QueryClient } from '@tanstack/react-query'
import {
  Outlet,
  createRootRouteWithContext,
  createRoute,
  createRouter,
  redirect,
} from '@tanstack/react-router'
import { homeFor, meQuery } from '@/api/auth'
import { LOOKUP_SCREEN } from '@/components/lookups-tabs/LookupButton'
import type { AppScreen } from '@/components/shell/AppContent'
import { AppSkeleton } from '@/components/shell'
import { SCREEN_HEADINGS } from '@/screens'
import { AdminLogin } from '@/screens/auth/AdminLogin'
import { Login } from '@/screens/auth/Login'
import { Signup } from '@/screens/auth/Signup'
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

interface RouterContext {
  queryClient: QueryClient
}

const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: Outlet,
})

/**
 * The gate every private route sits behind.
 *
 * In `beforeLoad` rather than in a component: the route does not begin to load
 * until the answer is in, so a signed-out visitor never gets a frame of the
 * screen they are not allowed to see, and there is no second render to loop
 * on. `ensureQueryData` shares one fetch with the `useMe` every screen calls.
 */
async function requireAuth(
  { queryClient }: RouterContext,
  href: string,
) {
  const me = await queryClient.ensureQueryData(meQuery)
  if (!me) {
    // Carried so signing in finishes the trip they started.
    throw redirect({ to: '/login', search: { redirect: href } })
  }
  return me
}

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  // Not a screen: the question "where does this account belong?".
  beforeLoad: async ({ context }) => {
    const me = await context.queryClient.ensureQueryData(meQuery)
    throw redirect({ to: me ? homeFor(me) : '/login' })
  },
})

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  validateSearch: (search: Record<string, unknown>): { redirect?: string } =>
    typeof search.redirect === 'string' ? { redirect: search.redirect } : {},
  component: Login,
})

const signupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/signup',
  component: Signup,
})

const adminLoginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin/login',
  component: AdminLogin,
})

const projectsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/projects',
  beforeLoad: ({ context, location }) => requireAuth(context, location.href),
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
  beforeLoad: async ({ context, location, params }) => {
    await requireAuth(context, location.href)
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
    throw redirect({ to: '/' })
  },
})

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  signupRoute,
  adminLoginRoute,
  projectsRoute,
  editorRoute,
  catchAllRoute,
])

export function makeRouter(queryClient: QueryClient) {
  return createRouter({
    routeTree,
    context: { queryClient },
    // The guards await `me` before a private route loads, and on a cold load
    // that is a round trip with nothing on screen behind it. A skeleton rather
    // than a blank frame, and immediately, since waiting a second to admit
    // something is loading is the flicker it is meant to avoid.
    defaultPendingComponent: () => <AppSkeleton screen="details" />,
    defaultPendingMs: 0,
  })
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof makeRouter>
  }
}
