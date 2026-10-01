import { useMemo } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useAdminProjects, type AdminProject } from '@/api/admin-console'
import {
  columnHelper,
  DataTable,
  type DataTableColumns,
  type DataTableFilter,
} from '@/components/data-table'
import { PageHead } from '@/components/shell'
import { money } from '@/lib/format/utils'
import { shortDate } from '@/lib/format/dates'
import { STATUS_LABELS } from '@/screens/projects/status'
import { Skeleton } from '@/components/ui/skeleton'

// Typed against the schema's enum, so a new status breaks the build here
// rather than rendering an empty cell (#71). The raw value is the fallback all
// the same, for a status the generated types have not caught up with.
const statusLabel = (status: AdminProject['status']) =>
  status === null ? 'No budget' : (STATUS_LABELS[status] ?? status)

const ownerName = (row: AdminProject) => row.owner.name || row.owner.email

const FILTERS: DataTableFilter<AdminProject>[] = [
  { id: 'status', label: 'Status', value: (row) => statusLabel(row.status) },
  { id: 'faculty', label: 'Faculty', value: (row) => row.faculty },
  { id: 'department', label: 'Department', value: (row) => row.department },
  { id: 'owner', label: 'Owner', value: ownerName },
]

const col = columnHelper<AdminProject>()

const columns = (
  open: (row: AdminProject) => void,
): DataTableColumns<AdminProject> =>
  col.columns([
    col.accessor('reference', {
      header: 'Reference',
      meta: {
        className: 'w-[150px] whitespace-nowrap font-medium text-primary',
      },
    }),
    col.accessor('title', {
      header: 'Title',
      // Bounded and wrapping: the table sizes to its content, and the owner
      // column pushes long titles off the side of the page otherwise.
      cell: ({ row }) => (
        <div className="max-w-[300px] py-0.5 whitespace-normal">
          <button
            type="button"
            onClick={() => open(row.original)}
            className="cursor-pointer text-left font-medium hover:underline"
          >
            {row.original.title || 'Untitled'}
          </button>
          <div className="text-muted-foreground">{row.original.department}</div>
        </div>
      ),
    }),
    col.accessor(ownerName, {
      id: 'owner',
      header: 'Owner',
      cell: ({ row }) => (
        <div className="py-0.5">
          <div>{ownerName(row.original)}</div>
          {row.original.owner.name && (
            <div className="text-muted-foreground">
              {row.original.owner.email}
            </div>
          )}
        </div>
      ),
      meta: { className: 'w-[210px]' },
    }),
    col.accessor((row) => statusLabel(row.status), {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <span
          className={
            row.original.status === null
              ? 'text-muted-foreground'
              : 'text-primary'
          }
        >
          {statusLabel(row.original.status)}
          {row.original.budget_count > 1 && (
            <span className="text-muted-foreground">
              {' '}
              · {row.original.budget_count} budgets
            </span>
          )}
        </span>
      ),
      meta: { className: 'w-[200px]' },
    }),
    col.accessor('total_price_inc_gst', {
      header: 'Total price (inc. GST)',
      cell: ({ row }) =>
        row.original.budget_id === null
          ? '—'
          : money(row.original.total_price_inc_gst),
      meta: {
        align: 'right',
        className: 'w-[150px] whitespace-nowrap tabular',
      },
    }),
    col.accessor('updated_at', {
      header: 'Last updated',
      cell: ({ row }) => shortDate(row.original.updated_at),
      meta: {
        align: 'right',
        className: 'w-[130px] whitespace-nowrap text-muted-foreground',
      },
    }),
  ])

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
      columns((row) =>
        navigate({
          to: '/projects/$projectId/$screen',
          params: { projectId: row.id, screen: 'details' },
        }),
      ),
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
          <div
            className="space-y-3 p-4"
            role="status"
            aria-label="Loading projects"
          >
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-9" />
            ))}
          </div>
        ) : (
          <DataTable
            columns={table}
            rows={projects ?? []}
            getRowId={byId}
            emptyMessage="No projects yet."
            sortable
            searchable
            filters={FILTERS}
            flush
          />
        )}
      </section>
    </>
  )
}
