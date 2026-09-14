import { queryOptions, useSuspenseQuery } from '@tanstack/react-query'
import { api, ApiError } from '@/lib/api'
import type { LookupTables } from '@/types'

export const lookupsQuery = queryOptions({
  queryKey: ['lookups'] as const,
  queryFn: async (): Promise<LookupTables> => {
    const { data, error, response } = await api.GET('/api/lookups/')
    if (error) throw new ApiError(response.status, error)
    return data
  },
  staleTime: Infinity,
})

export function useLookups() {
  return useSuspenseQuery(lookupsQuery)
}
