import { useQuery } from '@tanstack/react-query'

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
const AUDIT_MAX = 500

/** Plain queries, not suspense: each block on these screens draws its own skeleton. */
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

/** The newest entries the API allows, filtered and paged in the table. */
export function useAudit() {
  return useQuery(
    adminQuery(
      ['audit'],
      () => api.GET('/api/admin/audit/', { params: { query: { limit: AUDIT_MAX } } }),
      FRESH,
    ),
  )
}
