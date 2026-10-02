import { queryOptions, useSuspenseQuery } from '@tanstack/react-query'

import { api, unwrap } from '@/lib/api'

export const lookupsQuery = queryOptions({
  queryKey: ['lookups'] as const,
  queryFn: async () => {
    return unwrap(await api.GET('/api/lookups/'))
  },
  staleTime: Infinity,
})

export function useLookups() {
  return useSuspenseQuery(lookupsQuery)
}
