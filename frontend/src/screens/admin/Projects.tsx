import { useNavigate } from '@tanstack/react-router'
import { useMemo } from 'react'

import { type AdminProject, useAdminProjects } from '@/api/admin-console'
import { DataTable, type DataTableFilter } from '@/components/data-table'
import { PageHead } from '@/components/shell'
import { RowsSkeleton } from '@/components/shell/skeleton/RowsSkeleton'
import { ownerName, statusLabel } from '@/lib/status'
import { projectColumns } from '@/screens/projects/columns'

const FILTERS: DataTableFilter<AdminProject>[] = [
  { id: 'status', label: 'Status', value: (row) => statusLabel(row.status) },
  { id: 'faculty', label: 'Faculty', value: (row) => row.faculty },
  { id: 'department', label: 'Department', value: (row) => row.department },
  { id: 'owner', label: 'Owner', value: ownerName },
]

const byId = (row: AdminProject) => String(row.id)

/**
 * Every project in the tool, whoever owns it (#71). Read-only: a row opens the
 * costing, where every screen is read-only to anyone but its owner, and
 * nothing here approves, rejects or withdraws. That is the queue's job, and a
 * second way into the state machine is how a costing ends up in two states.
 */
export function Projects() {
  const { data: projects, isPending } = useAdminProjects()
  const navigate = useNavigate()
  const table = useMemo(
    () =>
      projectColumns<AdminProject>({
        open: (row) =>
          navigate({
            to: '/projects/$projectId/$screen',
            params: { projectId: row.id, screen: 'details' },
          }),
        ownerHeader: 'Owner',
      }),
    [navigate],
  )

  return (
    <>
      <PageHead
        title="Project register"
        subtitle={
          projects
            ? `Every project in the tool · ${projects.length} in all`
            : 'Every project in the tool'
        }
      />
      <section className="overflow-hidden rounded-lg border bg-card">
        {isPending ? (
          <RowsSkeleton label="Loading projects" className="p-4" />
        ) : (
          <DataTable
            columns={table}
            rows={projects ?? []}
            getRowId={byId}
            emptyMessage="No projects yet."
            sortable
            searchable
            hideable
            filters={FILTERS}
            flush
          />
        )}
      </section>
    </>
  )
}
