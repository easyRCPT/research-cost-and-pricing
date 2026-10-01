import {
  queryOptions,
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query'

import { api, unwrap } from '@/lib/api'
import type { ProjectCreate } from '@/types'

export const projectsQuery = queryOptions({
  queryKey: ['projects'] as const,
  queryFn: async () => {
    return unwrap(await api.GET('/api/projects/'))
  },
})

export function useProjects() {
  return useSuspenseQuery(projectsQuery)
}

export function useCreateProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (body: ProjectCreate) => {
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
