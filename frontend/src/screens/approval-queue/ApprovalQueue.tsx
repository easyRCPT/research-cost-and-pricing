import { Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

import { type QueueRow, useApprovalQueue } from '@/api/approvals'
import { Pager } from '@/components/data-table'
import { PageHead, Panel } from '@/components/shell'
import { Badge } from '@/components/ui/badge'
import { dateTime } from '@/lib/format/dates'
import { money } from '@/lib/format/utils'

import { ApprovalsNav } from './ApprovalsNav'
import { rememberApprovalsPage } from './returnTo'

/**
 * Grouped by the authorisation being asked for, rather than a level column to
 * decode: one person can hold both a head-of-department and a dean assignment,
 * and the heading is what says which hat each row is under (#84).
 *
 * A row opens the costing itself. The approver reads it through the
 * calculator's own screens, read-only, and decides on its Approvals screen.
 */
const GROUPS = [
  { level: 'department', title: 'Authorising as Head of Department' },
  { level: 'faculty', title: 'Authorising as Dean or delegate' },
]

export function ApprovalQueue() {
  const { data: rows } = useApprovalQueue()
  useEffect(() => rememberApprovalsPage('/approvals'), [])

  return (
    <>
      <PageHead
        title="Approvals"
        subtitle="Costings waiting on your authorisation"
        right={<ApprovalsNav current="queue" />}
      />

      {rows.length === 0 && (
        <Panel title="Nothing is waiting on you">
          <p className="max-w-[70ch] text-[13.5px] text-muted-foreground">
            When a researcher submits a costing from a department or faculty
            you are responsible for, it appears here with its price and the
            reasons it needs your authorisation.
          </p>
        </Panel>
      )}

      {GROUPS.map((group) => {
        const mine = rows.filter((row) => row.level === group.level)
        if (mine.length === 0) return null
        return <Group key={group.level} title={group.title} rows={mine} />
      })}
    </>
  )
}

function Group({ title, rows }: { title: string; rows: QueueRow[] }) {
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  // Deciding the last row on the last page would otherwise leave it empty.
  const page = Math.min(pageIndex, Math.max(0, Math.ceil(rows.length / pageSize) - 1))
  const shown = rows.slice(page * pageSize, (page + 1) * pageSize)

  return (
    <Panel title={title} className="mb-4">
      <div className="divide-y rounded-md border">
        {shown.map((row) => (
          <Row key={row.step_id} row={row} />
        ))}
      </div>
      <Pager
        pageIndex={page}
        pageSize={pageSize}
        total={rows.length}
        onPageIndex={setPageIndex}
        onPageSize={(size) => {
          setPageSize(size)
          setPageIndex(0)
        }}
        noun={['costing', 'costings']}
        className="px-0 pb-0"
      />
    </Panel>
  )
}

function Row({ row }: { row: QueueRow }) {
  const { budget } = row
  return (
    <Link
      to="/projects/$projectId/$screen"
      params={{ projectId: budget.project_id, screen: 'approvals' }}
      className="grid grid-cols-[1fr_auto] items-baseline gap-4 px-4 py-3 hover:bg-muted/50"
    >
      <span>
        <span className="font-medium">{budget.project_title}</span>
        {row.dean_triggers.length > 0 && row.level === 'department' && (
          <Badge variant="secondary" className="ml-2 align-middle">Dean after you</Badge>
        )}
        <span className="block text-[12.5px] text-muted-foreground">
          {budget.reference ? `${budget.reference} · ` : ''}
          {budget.submitted_by} · {budget.department} · submitted {dateTime(budget.submitted_at)}
        </span>
      </span>
      <span className="text-right">
        <span className="tabular block text-[14px] font-semibold">{money(budget.total_price_inc_gst)}</span>
        <span className="text-[12.5px] font-medium text-primary">Review →</span>
      </span>
    </Link>
  )
}
