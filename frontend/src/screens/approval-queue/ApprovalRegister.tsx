import { useNavigate } from '@tanstack/react-router'
import { useEffect, useMemo } from 'react'

import { useProjectFilters, useProjects } from '@/api/projects'
import {
  DataTable,
  type DataTableFilter,
  useRemote,
} from '@/components/data-table'
import { PageHead } from '@/components/shell'
import { RowsSkeleton } from '@/components/shell/skeleton/RowsSkeleton'
import { ownerName, statusLabel } from '@/lib/status'
import { cn } from '@/lib/utils'
import { projectColumns } from '@/screens/projects/columns'
import {
  projectFilterOptions,
  projectFilterQuery,
} from '@/screens/projects/filters'
import type { ProjectRow } from '@/types'

import { ApprovalsNav } from './ApprovalsNav'
import { rememberApprovalsPage } from './returnTo'

const FILTERS: DataTableFilter<ProjectRow>[] = [
  { id: 'status', label: 'Status', value: (row) => statusLabel(row.status) },
  { id: 'faculty', label: 'Faculty', value: (row) => row.faculty },
  { id: 'department', label: 'Department', value: (row) => row.department },
  { id: 'owner', label: 'Submitted by', value: ownerName },
]

const byId = (row: ProjectRow) => String(row.id)

/**
 * Everything in the approver's area, decided or not (#98). The queue answers
 * "what is waiting on me"; this answers "what has passed through me, and
 * where did it get to". The same scoped list the projects screen reads, so a
 * researcher here sees only their own and a staff account with no assignment
 * sees nothing. A row opens the costing itself, read-only.
 */
export function ApprovalRegister() {
  const paged = useRemote()
  const rows = useProjects({
    ...projectFilterQuery(paged.filters),
    ...paged.query,
  })
  const values = useProjectFilters({
    ...projectFilterQuery(paged.filters),
    q: paged.query.q,
  }).data
  const options = useMemo(() => projectFilterOptions(values), [values])
  const navigate = useNavigate()
  useEffect(() => rememberApprovalsPage('/approvals/register'), [])

  const table = useMemo(
    () =>
      projectColumns<ProjectRow>({
        open: (row) =>
          navigate({
            to: '/projects/$projectId/$screen',
            params: { projectId: row.id, screen: 'details' },
          }),
        ownerHeader: 'Submitted by',
      }),
    [navigate],
  )

  return (
    <>
      <PageHead
        title="Project register"
        subtitle="Every costing in your area, decided or not"
        right={<ApprovalsNav current="register" />}
      />

      <section
        className={cn(
          'overflow-hidden rounded-lg border bg-card',
          rows.isPlaceholderData && 'opacity-70',
        )}
      >
        {rows.data ? (
          <DataTable
            columns={table}
            rows={rows.data.results}
            getRowId={byId}
            emptyMessage="Costings submitted from a department or faculty you are responsible for are listed here, whatever became of them."
            sortable
            searchable
            hideable
            filters={FILTERS}
            flush
            remote={paged.remote(rows.data, options)}
          />
        ) : (
          <RowsSkeleton label="Loading projects" className="p-4" />
        )}
      </section>
    </>
  )
}
