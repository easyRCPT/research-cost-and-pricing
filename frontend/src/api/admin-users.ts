import {
  keepPreviousData,
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query'
import { api, ApiError } from '@/lib/api'
import { meQuery } from '@/api/auth'
import type { components } from '@/types/api'

export type AdminUser = components['schemas']['AdminUser']
export type Role = components['schemas']['RoleEnum']

const usersKey = ['admin', 'users'] as const

/** Filtered on the server, and the last list held while the next one loads. */
export function useAdminUsers(q: string) {
  return useQuery({
    queryKey: [...usersKey, q],
    queryFn: async (): Promise<AdminUser[]> => {
      const { data, error, response } = await api.GET('/api/admin/users/', {
        params: { query: q ? { q } : {} },
      })
      if (error) throw new ApiError(response.status, error)
      return data
    },
    placeholderData: keepPreviousData,
  })
}

const groupsQuery = queryOptions({
  queryKey: ['admin', 'groups'] as const,
  queryFn: async (): Promise<string[]> => {
    const { data, error, response } = await api.GET('/api/admin/groups/')
    if (error) throw new ApiError(response.status, error)
    return data
  },
  staleTime: Infinity,
})

/** The group names that exist, so the screen cannot offer one that does not. */
export function useGroups() {
  return useSuspenseQuery(groupsQuery)
}

function useRefresh() {
  const queryClient = useQueryClient()
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: usersKey }),
      // An administrator editing their own account changes who `me` is.
      queryClient.invalidateQueries({ queryKey: meQuery.queryKey }),
    ])
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
      const { error, response } = await api.PATCH('/api/admin/users/{user_id}/', {
        params: { path: { user_id: id } },
        body: changes,
      })
      if (error) throw new ApiError(response.status, error)
    },
    onSettled: refresh,
  })
}

export function useCreateUser() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: async (body: components['schemas']['UserCreate']) => {
      const { error, response } = await api.POST('/api/admin/users/', { body })
      if (error) throw new ApiError(response.status, error)
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
      const { error, response } = await api.POST('/api/admin/users/{user_id}/assignments/', {
        params: { path: { user_id: id } },
        body: { role, department, faculty },
      })
      if (error) throw new ApiError(response.status, error)
    },
    onSettled: refresh,
  })
}

export function useRemoveAssignment() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: async ({ id, assignmentId }: { id: number; assignmentId: number }) => {
      const { error, response } = await api.DELETE(
        '/api/admin/users/{user_id}/assignments/{assignment_id}/',
        { params: { path: { user_id: id, assignment_id: assignmentId } } },
      )
      if (error) throw new ApiError(response.status, error)
    },
    onSettled: refresh,
  })
}
