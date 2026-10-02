import {
  keepPreviousData,
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query'

import { pageOptions } from '@/api/cursor'
import { api, unwrap } from '@/lib/api'
import type { ProjectCreate } from '@/types'
import type { operations } from '@/types/api'

export type ProjectQuery = NonNullable<
  operations['projects_list']['parameters']['query']
>

/** Everything read about projects sits under `all`, so one invalidation refreshes it. */
export const projectKeys = {
  all: ['projects'] as const,
  lists: ['projects', 'list'] as const,
  list: (query: ProjectQuery) => ['projects', 'list', query] as const,
  filters: ['projects', 'filters'] as const,
  one: (id: number) => ['projects', id] as const,
}

/** One cursor page of the projects the caller can see. */
export function useProjects(query: ProjectQuery) {
  return useQuery({
    queryKey: projectKeys.list(query),
    queryFn: async () =>
      unwrap(await api.GET('/api/projects/', { params: { query } })),
    ...pageOptions(query.cursor),
  })
}

/** Each filter's values, counted against the search and the other filters. */
export function useProjectFilters(query: ProjectQuery) {
  return useQuery({
    queryKey: [...projectKeys.filters, query],
    queryFn: async () =>
      unwrap(await api.GET('/api/projects/filters/', { params: { query } })),
    placeholderData: keepPreviousData,
  })
}

const projectQuery = (id: number) =>
  queryOptions({
    queryKey: projectKeys.one(id),
    queryFn: async () => {
      const reply = await api.GET('/api/projects/{project_id}/', {
        params: { path: { project_id: id } },
      })
      // One nobody can see is a kept or typed URL, not a failure.
      return reply.response.status === 404 ? null : unwrap(reply)
    },
  })

export function useProject(id: number) {
  return useSuspenseQuery(projectQuery(id))
}

export function useCreateProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (body: ProjectCreate) => {
      return unwrap(await api.POST('/api/projects/', { body }))
    },
    // The response is the row the editor opens on, so it opens without a
    // second round trip.
    onSuccess: (row) => {
      queryClient.setQueryData(projectKeys.one(row.id), row)
      queryClient.invalidateQueries({ queryKey: projectKeys.lists })
      queryClient.invalidateQueries({ queryKey: projectKeys.filters })
    },
  })
}
