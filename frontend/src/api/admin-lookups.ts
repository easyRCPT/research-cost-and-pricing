import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query'
import { api, ApiError } from '@/lib/api'
import { lookupsQuery } from '@/api/lookups'
import type { components } from '@/types/api'

export type LookupVersion = components['schemas']['LookupVersion']
export type LookupChange = components['schemas']['LookupChange']
export type ChangesApplied = components['schemas']['ChangesApplied']
export type PricedOn = components['schemas']['PricedOn']
export type VersionBudget = components['schemas']['VersionBudget']

/**
 * The tables an administrator edits here: the versioned ones with one figure
 * per row, which are the ones that price a costing. They change only as a
 * reviewed set (#138), and a set saved once a costing has been submitted on
 * the current rates copies them into a new version first, so nothing already
 * priced moves.
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

/** The costings stamped with one version (#142), fetched when asked for. */
export function useVersionBudgets(versionId: number) {
  return useQuery({
    queryKey: [...versionsQuery.queryKey, versionId, 'budgets'] as const,
    queryFn: async (): Promise<VersionBudget[]> => {
      const { data, error, response } = await api.GET(
        '/api/admin/lookups/versions/{version_id}/budgets/',
        { params: { path: { version_id: versionId } } },
      )
      if (error) throw new ApiError(response.status, error)
      return data
    },
  })
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

/**
 * Save a set of changes in one request (#138): all of it or none of it. A
 * refusal names the change that caused it by its index, in the error's
 * `changes.<index>` fields.
 */
export function useApplyChanges() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: async ({ note, changes }: { note: string; changes: LookupChange[] }) => {
      const { data, error, response } = await api.POST('/api/admin/lookups/changes/', {
        body: { note, changes },
      })
      if (error) throw new ApiError(response.status, error)
      return data
    },
    onSuccess: refresh,
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
      return data
    },
    onSettled: refresh,
  })
}
