import { useState } from 'react'
import { useApprovalQueue, type QueueRow } from '@/api/approvals'
import { PageHead, Panel } from '@/components/shell'
import { money } from '@/lib/format/utils'
import { shortDate } from '@/lib/format/dates'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { DecisionPanel, type Decided } from './DecisionPanel'

/**
 * Grouped by the authorisation being asked for, rather than a level column to
 * decode: one person can hold both a head-of-department and a dean assignment,
 * and the heading is what says which hat each row is under (#84).
 */
const GROUPS = [
  {
    level: 'department',
    title: 'Authorising as Head of Department',
    note: 'The first authorisation. Every costing needs one.',
  },
  {
    level: 'faculty',
    title: 'Authorising as Dean or delegate',
    note: 'The second authorisation, asked for only when a costing needs it.',
  },
]

const WHERE_IT_WENT: Record<string, string> = {
  dean_review: 'It has gone to the Dean for the second authorisation.',
  approved: 'It is approved. The price is final and can go to the funder.',
  rejected: 'It has gone back to the researcher, who can revise it as a new draft.',
}

export function ApprovalQueue() {
  const { data: rows } = useApprovalQueue()
  const [open, setOpen] = useState<number | null>(null)
  const [last, setLast] = useState<Decided | null>(null)

  const decided = (outcome: Decided) => {
    setLast(outcome)
    setOpen(null)
  }

  return (
    <>
      <PageHead
        title="Approvals"
        subtitle="Costings waiting on your authorisation"
      />

      {last && (
        <Alert className="mb-4" role="status">
          <AlertDescription>
            <b>
              You {last.decision === 'reject' ? 'rejected' : 'approved'}{' '}
              {last.title}.
            </b>{' '}
            {WHERE_IT_WENT[last.status] ?? `It is now ${last.status}.`}
          </AlertDescription>
        </Alert>
      )}

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
        return (
          <Panel key={group.level} title={group.title} description={group.note} className="mb-4">
            <div className="divide-y rounded-md border">
              {mine.map((row) => (
                <Row
                  key={row.step_id}
                  row={row}
                  open={open === row.step_id}
                  onOpen={() => setOpen(open === row.step_id ? null : row.step_id)}
                  onDecided={decided}
                />
              ))}
            </div>
          </Panel>
        )
      })}
    </>
  )
}

function Row({
  row,
  open,
  onOpen,
  onDecided,
}: {
  row: QueueRow
  open: boolean
  onOpen: () => void
  onDecided: (outcome: Decided) => void
}) {
  const { budget } = row
  return (
    <div className="px-4 py-3">
      <button
        type="button"
        onClick={onOpen}
        aria-expanded={open}
        className="grid w-full grid-cols-[1fr_auto] items-baseline gap-4 text-left"
      >
        <span>
          <span className="font-medium">{budget.project_title}</span>
          <span className="block text-[12.5px] text-muted-foreground">
            {budget.submitted_by} · {budget.department} · submitted{' '}
            {shortDate(budget.submitted_at)}
          </span>
        </span>
        <span className="tabular text-[14px] font-semibold">
          {money(budget.total_price_inc_gst)}
        </span>
      </button>
      {open && <DecisionPanel row={row} onDecided={onDecided} />}
    </div>
  )
}
