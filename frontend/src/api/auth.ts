import {
  type QueryClient,
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'

import { api, unwrap } from '@/lib/api'
import type { components } from '@/types/api'

export type Me = components['schemas']['Me']
export type AccountType = components['schemas']['AccountTypeEnum']
type Signup = components['schemas']['Signup']
type SignupPending = components['schemas']['SignupPending']
type Login = components['schemas']['Login']
type AdminLogin = components['schemas']['AdminLogin']

const meKey = ['me'] as const

/**
 * Who is signed in, or nobody.
 *
 * `retry: false` because a 401 is the answer to the question, not a fault to
 * be tried again: every route waits on this, and retrying would hold the app
 * behind a skeleton for no reason.
 *
 * Shared with the route guards, which await the same options before a private
 * route is allowed to load, so the answer is fetched once either way.
 */
export const meQuery = queryOptions({
  queryKey: meKey,
  queryFn: async (): Promise<Me | null> => {
    const result = await api.GET('/api/auth/me/')
    if (result.response.status === 401) return null
    return unwrap(result)
  },
  retry: false,
  staleTime: Infinity,
})

export function useMe() {
  return useQuery(meQuery)
}

/**
 * Put the csrftoken cookie in place before the first unsafe request.
 *
 * Signing in is itself CSRF protected, and a browser nobody has signed in on
 * has no token to send: `me` answers 401 before its handler runs, so it cannot
 * be what hands one out.
 */
async function ensureCsrf() {
  await api.GET('/api/auth/csrf/')
}

function useSignIn<TBody>(
  call: (body: TBody) => Promise<Me>,
  queryClient: QueryClient,
) {
  return useMutation({
    mutationFn: async (body: TBody) => {
      await ensureCsrf()
      return call(body)
    },
    // Drop whatever the last account left cached. The reply is the same shape
    // `me` answers with, so the guards can read it without a second round trip.
    onSuccess: (me) => {
      queryClient.removeQueries()
      queryClient.setQueryData(meKey, me)
    },
  })
}

export function useLogin() {
  const queryClient = useQueryClient()
  return useSignIn<Login>(async (body) => {
    return unwrap(await api.POST('/api/auth/login/', { body }))
  }, queryClient)
}

/** Creates the account unconfirmed and emails the link; nobody is signed in yet. */
export function useSignup() {
  return useMutation({
    mutationFn: async (body: Signup): Promise<SignupPending> => {
      await ensureCsrf()
      return unwrap(await api.POST('/api/auth/signup/', { body }))
    },
  })
}

/**
 * Polls the sign-up this tab started. Resolves to the new account once the
 * link has been opened anywhere, and the server has signed this tab in.
 */
export function useSignupStatus(enabled: boolean) {
  const queryClient = useQueryClient()
  return useQuery({
    queryKey: ['signup-status'],
    queryFn: async (): Promise<Me | null> => {
      const result = await api.GET('/api/auth/signup/status/')
      if (result.response.status === 202) return null
      const me = unwrap(result) as Me
      queryClient.setQueryData(meKey, me)
      return me
    },
    enabled,
    refetchInterval: (query) => (query.state.data ? false : 3000),
    // The link is opened in another tab, so this one is hidden while it waits.
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
    retry: false,
  })
}

export function useResendSignup() {
  return useMutation({
    mutationFn: async () => {
      unwrap(await api.POST('/api/auth/signup/resend/', {}))
    },
  })
}

export function useConfirmSignup() {
  return useMutation({
    mutationFn: async (token: string) => {
      await ensureCsrf()
      unwrap(await api.POST('/api/auth/signup/confirm/', { body: { token } }))
    },
  })
}

export function useAdminLogin() {
  const queryClient = useQueryClient()
  return useSignIn<AdminLogin>(async (body) => {
    return unwrap(await api.POST('/api/auth/admin-login/', { body }))
  }, queryClient)
}

/** The caller clears the cache after navigating away; see AccountMenu. */
export function useLogout() {
  return useMutation({
    mutationFn: async () => {
      unwrap(await api.POST('/api/auth/logout/', {}))
    },
  })
}

export const SUPERADMIN = 'superadmin'
export const RESEARCHER = 'researcher'
export const STAFF = 'staff'

/** Approving is an org assignment, never a group (#41). */
export const isApprover = (me: Me) =>
  me.assignments.length > 0

/**
 * Where signing in lands someone.
 *
 * A superadmin on the console (#62), an approver on their queue (#84),
 * everyone else on their projects.
 */
export function homeFor(me: Me): '/projects' | '/approvals' | '/admin' {
  if (me.groups.includes(SUPERADMIN)) return '/admin'
  // Approving is an assignment, not a group, so this reads assignments.
  if (isApprover(me)) return '/approvals'
  return '/projects'
}
