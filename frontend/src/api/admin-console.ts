import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { adminQuery } from '@/api/query'
import { api } from '@/lib/api'
import type { components } from '@/types/api'

export type AuditEntry = components['schemas']['AuditEntry']
export type AdminProject = components['schemas']['AdminProject']
export type Overview = components['schemas']['Overview']
export type ApproverGaps = components['schemas']['ApproverGaps']

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
  return useQuery(adminQuery(['overview'], () => api.GET('/api/admin/overview/'), FRESH))
}

/** Costings waiting on a role nobody holds, and the units missing one (#121). */
export function useApproverGaps() {
  return useQuery(adminQuery(['approver-gaps'], () => api.GET('/api/admin/approver-gaps/'), FRESH))
}

export function useAdminProjects() {
  return useQuery(adminQuery(['projects'], () => api.GET('/api/admin/projects/'), FRESH))
}

export function useAudit(action: string, limit: number) {
  return useQuery(
    adminQuery(
      ['audit', action, limit],
      () =>
        api.GET('/api/admin/audit/', {
          params: { query: { limit, ...(action ? { action } : {}) } },
        }),
      { ...FRESH, placeholderData: keepPreviousData },
    ),
  )
}

/** Read off the log itself, so the filter never hides an action that exists. */
export function useAuditActions() {
  return useQuery(adminQuery(['audit-actions'], () => api.GET('/api/admin/audit/actions/'), FRESH))
}
