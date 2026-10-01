import {
  type QueryKey,
  queryOptions,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query'

import { unwrap } from '@/lib/api'

/** What openapi-fetch answers with, as `unwrap` reads it. */
type Reply<T> = { data?: T; error?: unknown; response: Response }

/** A read of the admin console, keyed under `admin`. */
export function adminQuery<T>(
  key: readonly unknown[],
  fetch: () => Promise<Reply<T>>,
  options: Pick<UseQueryOptions<T>, 'staleTime' | 'placeholderData'> = {},
) {
  return queryOptions({
    queryKey: ['admin', ...key] as const,
    queryFn: async () => unwrap(await fetch()),
    ...options,
  })
}

/** Invalidates each key, and resolves once every one has refetched. */
export function useInvalidate() {
  const queryClient = useQueryClient()
  return (...keys: QueryKey[]) =>
    Promise.all(
      keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
    )
}
