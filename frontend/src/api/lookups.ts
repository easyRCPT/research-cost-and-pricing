import { queryOptions, useSuspenseQuery } from '@tanstack/react-query'

import { api, unwrap } from '@/lib/api'
import type { LookupTables } from '@/types'

export const lookupsQuery = queryOptions({
  queryKey: ['lookups'] as const,
  queryFn: async (): Promise<LookupTables> => {
    return unwrap(await api.GET('/api/lookups/'))
  },
  staleTime: Infinity,
})

export function useLookups() {
  return useSuspenseQuery(lookupsQuery)
}
