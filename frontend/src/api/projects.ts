import {
  queryOptions,
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query'

import { api, ApiError } from '@/lib/api'
import type { ProjectCreate, ProjectRow } from '@/types'

export const projectsQuery = queryOptions({
  queryKey: ['projects'] as const,
  queryFn: async (): Promise<ProjectRow[]> => {
    const { data, error, response } = await api.GET('/api/projects/')
    if (error) throw new ApiError(response.status, error)
    return data
  },
})

export function useProjects() {
  return useSuspenseQuery(projectsQuery)
}

export function useCreateProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (body: ProjectCreate): Promise<ProjectRow> => {
      const { data, error, response } = await api.POST('/api/projects/', {
        body,
      })
      if (error) throw new ApiError(response.status, error)
      return data
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
