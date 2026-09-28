import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { api, ApiError } from '@/lib/api'
import type { components } from '@/types/api'

export type AuditEntry = components['schemas']['AuditEntry']
export type AdminProject = components['schemas']['AdminProject']
export type Overview = components['schemas']['Overview']

/**
 * These read what the rest of the console just did, so each is asked again
 * whenever it is opened rather than held for the app's five minutes.
 */
const FRESH = { staleTime: 0 } as const

/** The most the audit API returns at once (#67). */
export const AUDIT_LIMITS = [50, 100, 250, 500] as const

/**
 * Plain queries, not suspense: each block on these screens draws its own
 * skeleton, and a changed filter keeps the last answer on screen while the
 * next one loads rather than blanking the table.
 */
export function useOverview() {
  return useQuery({
    queryKey: ['admin', 'overview'] as const,
    queryFn: async (): Promise<Overview> => {
      const { data, error, response } = await api.GET('/api/admin/overview/')
      if (error) throw new ApiError(response.status, error)
      return data
    },
    ...FRESH,
  })
}

export function useAdminProjects() {
  return useQuery({
    queryKey: ['admin', 'projects'] as const,
    queryFn: async (): Promise<AdminProject[]> => {
      const { data, error, response } = await api.GET('/api/admin/projects/')
      if (error) throw new ApiError(response.status, error)
      return data
    },
    ...FRESH,
  })
}

export function useAudit(action: string, limit: number) {
  return useQuery({
    queryKey: ['admin', 'audit', action, limit] as const,
    queryFn: async (): Promise<AuditEntry[]> => {
      const { data, error, response } = await api.GET('/api/admin/audit/', {
        params: { query: { limit, ...(action ? { action } : {}) } },
      })
      if (error) throw new ApiError(response.status, error)
      return data
    },
    placeholderData: keepPreviousData,
    ...FRESH,
  })
}

/** Read off the log itself, so the filter never hides an action that exists. */
export function useAuditActions() {
  return useQuery({
    queryKey: ['admin', 'audit-actions'] as const,
    queryFn: async (): Promise<string[]> => {
      const { data, error, response } = await api.GET('/api/admin/audit/actions/')
      if (error) throw new ApiError(response.status, error)
      return data
    },
    ...FRESH,
  })
}
