import {
  keepPreviousData,
  useMutation,
  useQuery,
  useSuspenseQuery,
} from '@tanstack/react-query'

import { meQuery } from '@/api/auth'
import { adminQuery, useInvalidate } from '@/api/query'
import { api, unwrap } from '@/lib/api'
import type { components } from '@/types/api'

export type AdminUser = components['schemas']['AdminUser']
export type Role = components['schemas']['RoleEnum']

const usersKey = ['admin', 'users'] as const

/** Filtered on the server, and the last list held while the next one loads. */
export function useAdminUsers(q: string) {
  return useQuery(
    adminQuery(
      ['users', q],
      () =>
        api.GET('/api/admin/users/', {
          params: { query: q ? { q } : {} },
        }),
      { placeholderData: keepPreviousData },
    ),
  )
}

const groupsQuery = adminQuery(['groups'], () => api.GET('/api/admin/groups/'), {
  staleTime: Infinity,
})

/** The group names that exist, so the screen cannot offer one that does not. */
export function useGroups() {
  return useSuspenseQuery(groupsQuery)
}

function useRefresh() {
  const invalidate = useInvalidate()
  // An administrator editing their own account changes who `me` is.
  return () => invalidate(usersKey, meQuery.queryKey)
}

export function useUpdateUser() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: async ({
      id,
      changes,
    }: {
      id: number
      changes: { first_name?: string; last_name?: string; is_active?: boolean; groups?: string[] }
    }) => {
      unwrap(
        await api.PATCH('/api/admin/users/{user_id}/', {
          params: { path: { user_id: id } },
          body: changes,
        }),
      )
    },
    onSettled: refresh,
  })
}

export function useCreateUser() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: async (body: components['schemas']['UserCreate']) => {
      unwrap(await api.POST('/api/admin/users/', { body }))
    },
    onSettled: refresh,
  })
}

export function useAddAssignment() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: async ({
      id,
      role,
      department,
      faculty,
    }: {
      id: number
      role: Role
      department: string | null
      faculty: string | null
    }) => {
      unwrap(
        await api.POST('/api/admin/users/{user_id}/assignments/', {
          params: { path: { user_id: id } },
          body: { role, department, faculty },
        }),
      )
    },
    onSettled: refresh,
  })
}

export function useRemoveAssignment() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: async ({ id, assignmentId }: { id: number; assignmentId: number }) => {
      unwrap(
        await api.DELETE(
          '/api/admin/users/{user_id}/assignments/{assignment_id}/',
          { params: { path: { user_id: id, assignment_id: assignmentId } } },
        ),
      )
    },
    onSettled: refresh,
  })
}
