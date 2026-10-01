import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { pageOptions } from '@/api/cursor'
import { adminQuery } from '@/api/query'
import { api } from '@/lib/api'
import type { components, operations } from '@/types/api'

export type AuditEntry = components['schemas']['AuditEntry']
export type AdminProject = components['schemas']['AdminProject']
export type Overview = components['schemas']['Overview']
export type ApproverGaps = components['schemas']['ApproverGaps']

/**
 * These read what the rest of the console just did, so each is asked again
 * whenever it is opened rather than held for the app's five minutes.
 */
const FRESH = { staleTime: 0 } as const

/** Plain queries, not suspense: each block on these screens draws its own skeleton. */
export function useOverview() {
  return useQuery(adminQuery(['overview'], () => api.GET('/api/admin/overview/'), FRESH))
}

/** Costings waiting on a role nobody holds, and the units missing one (#121). */
export function useApproverGaps() {
  return useQuery(adminQuery(['approver-gaps'], () => api.GET('/api/admin/approver-gaps/'), FRESH))
}

export type AdminProjectQuery = NonNullable<
  operations['admin_projects_list']['parameters']['query']
>

/** One cursor page of every project, whoever owns it. */
export function useAdminProjects(query: AdminProjectQuery) {
  return useQuery(
    adminQuery(
      ['projects', query],
      () => api.GET('/api/admin/projects/', { params: { query } }),
      pageOptions(query.cursor),
    ),
  )
}

/** Counted against the search and the other filters. */
export function useAdminProjectFilters(query: AdminProjectQuery) {
  return useQuery(
    adminQuery(
      ['project-filters', query],
      () => api.GET('/api/admin/projects/filters/', { params: { query } }),
      { ...FRESH, placeholderData: keepPreviousData },
    ),
  )
}

export type AuditQuery = NonNullable<
  operations['admin_audit_list']['parameters']['query']
>

/** One cursor page of the log. */
export function useAudit(query: AuditQuery) {
  return useQuery(
    adminQuery(
      ['audit', query],
      () => api.GET('/api/admin/audit/', { params: { query } }),
      pageOptions(query.cursor),
    ),
  )
}

/**
 * Read off the log itself, so a filter never hides a value that exists, and
 * counted against the other filters.
 */
export function useAuditFilters(query: AuditQuery) {
  return useQuery(
    adminQuery(
      ['audit-filters', query],
      () => api.GET('/api/admin/audit/filters/', { params: { query } }),
      { ...FRESH, placeholderData: keepPreviousData },
    ),
  )
}
