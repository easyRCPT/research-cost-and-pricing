import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useProjectsWithStatus } from '@/api/projects'
import {
  columnHelper,
  DataTable,
  type DataTableColumns,
} from '@/components/data-table'
import { PageHead, Panel } from '@/components/shell'
import { Skeleton } from '@/components/ui/skeleton'
import { money } from '@/lib/format/utils'
import { shortDate } from '@/lib/format/dates'
import { cn } from '@/lib/utils'
import { STATUS_LABELS } from '@/lib/status'
import type { ProjectRow, Status } from '@/types'
import { ApprovalsNav } from './ApprovalsNav'
import { rememberApprovalsPage } from './returnTo'

// Every status the schema has, drafts aside: an approver never sees someone
// else's draft. Typed against the schema's enum (STATUS_LABELS is a
// Record<Status, string>), so a new status breaks the build here rather than
// going missing from the chips.
const STATUSES = (Object.keys(STATUS_LABELS) as Status[]).filter(
  (status) => status !== 'draft' && status !== 'submitted',
)

const ownerName = (row: ProjectRow) => row.owner.name || row.owner.email
const statusLabel = (status: ProjectRow['status']) =>
  status === null ? 'No budget' : (STATUS_LABELS[status] ?? status)

const col = columnHelper<ProjectRow>()

const columns = (
  open: (row: ProjectRow) => void,
): DataTableColumns<ProjectRow> =>
  col.columns([
    col.accessor('reference', {
      header: 'Reference',
      meta: {
        className: 'w-[150px] whitespace-nowrap font-medium text-primary',
      },
    }),
    col.accessor('title', {
      header: 'Title',
      cell: ({ row }) => (
        <div className="max-w-[320px] py-0.5 whitespace-normal">
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
      header: 'Submitted by',
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
      meta: { className: 'w-[220px]' },
    }),
    col.accessor((row) => statusLabel(row.status), {
      id: 'status',
      header: 'Status',
      meta: { className: 'w-[200px] text-primary' },
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

/**
 * Everything in the approver's area, decided or not (#98). The queue answers
 * "what is waiting on me"; this answers "what has passed through me, and
 * where did it get to". The same scoped list the projects screen reads, so a
 * researcher here sees only their own and a staff account with no assignment
 * sees nothing. A row opens the costing itself, read-only.
 */
export function ApprovalRegister() {
  const [status, setStatus] = useState<Status | null>(null)
  const {
    data: rows,
    isPending,
    isPlaceholderData,
  } = useProjectsWithStatus(status)
  const navigate = useNavigate()
  useEffect(() => rememberApprovalsPage('/approvals/register'), [])

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
        title="Approval register"
        subtitle="Every costing in your area, decided or not"
        right={<ApprovalsNav current="register" />}
      />

      <div
        role="group"
        aria-label="Status"
        className="mb-4 flex flex-wrap gap-2"
      >
        {[null, ...STATUSES].map((value) => (
          <button
            key={value ?? 'all'}
            type="button"
            aria-pressed={status === value}
            onClick={() => setStatus(value)}
            className={cn(
              'rounded-full border px-3 py-1 text-[13px]',
              status === value
                ? 'border-primary bg-primary text-primary-foreground'
                : 'bg-card hover:bg-muted',
            )}
          >
            {value === null ? 'All' : STATUS_LABELS[value]}
          </button>
        ))}
      </div>

      {isPending ? (
        <div
          className="space-y-3 rounded-lg border bg-card p-4"
          role="status"
          aria-label="Loading the register"
        >
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-9" />
          ))}
        </div>
      ) : rows && rows.length === 0 ? (
        <Panel
          title={
            status === null
              ? 'Nothing has been decided in your area yet'
              : `Nothing is ${STATUS_LABELS[status].toLowerCase()}`
          }
        >
          <p className="max-w-[70ch] text-[13.5px] text-muted-foreground">
            {status === null
              ? 'Costings submitted from a department or faculty you are responsible for are listed here, whatever became of them.'
              : 'No costing in your area has this status right now.'}
          </p>
        </Panel>
      ) : (
        <section
          className={cn(
            'overflow-hidden rounded-lg border bg-card',
            isPlaceholderData && 'opacity-70',
          )}
        >
          <DataTable
            columns={table}
            rows={rows ?? []}
            getRowId={(row) => String(row.id)}
            emptyMessage="Nothing here."
            sortable
            searchable
            flush
          />
        </section>
      )}
    </>
  )
}
