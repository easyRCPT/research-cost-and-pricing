import {
  keepPreviousData,
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query'

import { api, unwrap } from '@/lib/api'
import type { ProjectCreate, ProjectRow, Status } from '@/types'

export const projectsQuery = queryOptions({
  queryKey: ['projects'] as const,
  queryFn: async (): Promise<ProjectRow[]> => {
    return unwrap(await api.GET('/api/projects/'))
  },
})

export function useProjects() {
  return useSuspenseQuery(projectsQuery)
}

/**
 * The same list, narrowed by status on the server (#98). The previous rows stay
 * on screen while another status loads, so switching filters doesn't flash
 * empty.
 */
export function useProjectsWithStatus(status: Status | null) {
  return useQuery({
    queryKey: [...projectsQuery.queryKey, { status }] as const,
    queryFn: async (): Promise<ProjectRow[]> => {
      return unwrap(
        await api.GET('/api/projects/', {
          params: { query: status ? { status } : {} },
        }),
      )
    },
    placeholderData: keepPreviousData,
  })
}

export function useCreateProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (body: ProjectCreate): Promise<ProjectRow> => {
      return unwrap(await api.POST('/api/projects/', { body }))
    },
    // The response is the row the list wants, so the new project shows without
    // a second round trip. It sorts first because it was just touched.
    onSuccess: (row) =>
      queryClient.setQueryData(projectsQuery.queryKey, (rows) => [
        row,
        ...(rows ?? []),
      ]),
  })
}
