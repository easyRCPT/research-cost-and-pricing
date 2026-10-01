import { useNavigate } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'

import { useProjectsWithStatus } from '@/api/projects'
import { DataTable } from '@/components/data-table'
import { PageHead, Panel } from '@/components/shell'
import { RowsSkeleton } from '@/components/shell/skeleton/RowsSkeleton'
import { STATUS_LABELS } from '@/lib/status'
import { cn } from '@/lib/utils'
import { projectColumns } from '@/screens/projects/columns'
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
        <RowsSkeleton
          label="Loading the register"
          className="rounded-lg border bg-card p-4"
        />
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
            hideable
            flush
          />
        </section>
      )}
    </>
  )
}
