import {
  queryOptions,
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query'
import { api, ApiError } from '@/lib/api'
import { lookupsQuery } from '@/api/lookups'
import type { components } from '@/types/api'

export type LookupVersion = components['schemas']['LookupVersion']

/**
 * The tables an administrator edits here: the five that are versioned, which
 * are the ones that price a costing. An edit to any of them, once a costing has
 * been submitted on the current rates, copies the whole set into a new version
 * first, so nothing already priced moves.
 */
export type RateTable =
  | 'salary_rates'
  | 'salary_rate_multipliers'
  | 'eba_increases'
  | 'on_cost_rates'
  | 'calculation_constants'

export const versionsQuery = queryOptions({
  queryKey: ['admin', 'lookup-versions'] as const,
  queryFn: async (): Promise<LookupVersion[]> => {
    const { data, error, response } = await api.GET('/api/admin/lookups/versions/')
    if (error) throw new ApiError(response.status, error)
    return data
  },
})

export function useLookupVersions() {
  return useSuspenseQuery(versionsQuery)
}

/**
 * After any write the rates, and the version they sit in, may both have
 * changed. Returned so a mutation is not done until the screen is current.
 */
function useRefresh() {
  const queryClient = useQueryClient()
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: lookupsQuery.queryKey }),
      queryClient.invalidateQueries({ queryKey: versionsQuery.queryKey }),
    ])
}

/** Change one row's values, found by its natural key. */
export function useUpdateRate() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: async ({
      table,
      key,
      values,
    }: {
      table: RateTable
      key: Record<string, unknown>
      values: Record<string, unknown>
    }) => {
      const { error, response } = await api.PATCH('/api/lookups/{table}/', {
        params: { path: { table } },
        body: { lookup: key, values },
      })
      if (!response.ok) throw new ApiError(response.status, error)
    },
    onSettled: refresh,
  })
}

/** Add a row to a table, in the current version. */
export function useAddRate() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: async ({
      table,
      values,
    }: {
      table: RateTable
      values: Record<string, unknown>
    }) => {
      const { error, response } = await api.POST('/api/lookups/{table}/', {
        params: { path: { table } },
        body: { values },
      })
      if (!response.ok) throw new ApiError(response.status, error)
    },
    onSettled: refresh,
  })
}

/** Put an older set of rates back, as a new version (#137). */
export function useRestoreVersion() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: async (versionId: number) => {
      const { data, error, response } = await api.POST(
        '/api/admin/lookups/versions/{version_id}/restore/',
        { params: { path: { version_id: versionId } } },
      )
      if (error) throw new ApiError(response.status, error)
      return data.version_id
    },
    onSettled: refresh,
  })
}
