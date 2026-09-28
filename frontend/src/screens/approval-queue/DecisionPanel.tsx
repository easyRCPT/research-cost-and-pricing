import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useMe } from '@/api/auth'
import { useDecide, type Decision, type QueueRow } from '@/api/approvals'
import { Panel } from '@/components/shell'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ApiError } from '@/lib/api'
import { money } from '@/lib/format/utils'
import { describeTrigger } from '@/screens/approvals/triggers'
import { shortDate } from '@/lib/format/dates'

export interface Decided {
  title: string
  decision: Decision
  /** Where the server moved the budget: dean_review, approved or rejected. */
  status: string
}

/**
 * What confirming will do, in a sentence, because "approve" means three
 * different things depending on where the costing is (#84).
 */
function consequence(row: QueueRow, decision: Decision): string {
  const price = money(row.budget.total_price_inc_gst)
  const deanNeeded = row.dean_triggers.length > 0

  if (decision === 'reject') {
    return `It goes back to ${row.budget.submitted_by} as rejected. They can clone it into a new draft, revise it and submit again.`
  }
  if (row.level === 'faculty') {
    return `This is the final authorisation. It becomes approved at ${price} including GST, and that price is what goes to the funder.`
  }
  if (deanNeeded) {
    return 'It moves to the Dean for a second authorisation. Nothing is final until they decide.'
  }
  return `It becomes approved at ${price} including GST. No Dean is needed, so your decision finishes it.`
}

type Stage = 'choose' | 'compose' | 'confirm'

/**
 * The outcome is not shown here. A decision takes the row out of the queue, so
 * this panel unmounts with it the moment the queue refetches; the queue holds
 * the outcome instead and shows it above the list.
 */
export function DecisionPanel({
  row,
  onDecided,
}: {
  row: QueueRow
  onDecided: (outcome: Decided) => void
}) {
  const { data: me } = useMe()
  const decide = useDecide()
  const [stage, setStage] = useState<Stage>('choose')
  const [decision, setDecision] = useState<Decision>('approve')
  const [comment, setComment] = useState('')

  const { budget } = row
  const rejecting = decision === 'reject'
  const who = me ? `${me.user.first_name} ${me.user.last_name}`.trim() || me.user.email : ''

  const tooLate = decide.error instanceof ApiError && decide.error.status === 409

  return (
    <Panel
      title={`${budget.reference ?? ''} ${budget.project_title}`.trim()}
      className="mt-4"
    >
      <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-1.5 text-[13.5px]">
        <dt className="text-muted-foreground">Submitted by</dt>
        <dd>{budget.submitted_by}, {shortDate(budget.submitted_at)}</dd>
        <dt className="text-muted-foreground">Unit</dt>
        <dd>{budget.department} · {budget.faculty}</dd>
        <dt className="text-muted-foreground">Chief investigator</dt>
        <dd>{budget.chief_investigator || '—'}</dd>
        <dt className="text-muted-foreground">Price including GST</dt>
        <dd className="tabular font-semibold">{money(budget.total_price_inc_gst)}</dd>
        <dt className="text-muted-foreground">Margin</dt>
        <dd className="tabular">{(budget.margin * 100).toFixed(1)}%</dd>
      </dl>

      {row.dean_triggers.length > 0 && (
        <Alert className="mt-4">
          <AlertDescription>
            <b>
              {row.level === 'faculty'
                ? 'This reached you because'
                : 'After you, the Dean also has to authorise this, because'}
            </b>
            <ul className="mt-1 list-disc pl-5">
              {row.dean_triggers.map((code) => (
                <li key={code}>{describeTrigger(code)}.</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <p className="mt-4 text-[13px] text-muted-foreground">
        The rates were locked when this was submitted. A later change to a
        salary rate or an on-cost reprices new work only, so what you decide
        on is what it stays.{' '}
        <Link
          to="/projects/$projectId/$screen"
          params={{ projectId: budget.project_id, screen: 'details' }}
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          View the full budget
        </Link>
      </p>

      {tooLate && (
        <Alert className="mt-4">
          <AlertDescription>
            Someone else decided this first, so there is nothing left for you
            to sign. The queue has been refreshed.
          </AlertDescription>
        </Alert>
      )}
      {decide.error instanceof ApiError && !tooLate && (
        <Alert variant="destructive" className="mt-4">
          <AlertDescription>{decide.error.message}</AlertDescription>
        </Alert>
      )}

      {stage === 'choose' && !tooLate && (
        <div className="mt-5 flex flex-wrap gap-3">
          <Button onClick={() => { setDecision('approve'); setStage('compose') }}>
            Approve
          </Button>
          <Button
            variant="outline"
            className="border-destructive/40 text-destructive"
            onClick={() => { setDecision('reject'); setStage('compose') }}
          >
            Reject and send back
          </Button>
        </div>
      )}

      {stage === 'compose' && (
        <div className="mt-5 max-w-[640px]">
          <label htmlFor="decision-comment" className="text-[13px] font-medium">
            {rejecting ? 'What has to change?' : 'Comment (optional)'}
          </label>
          <Textarea
            id="decision-comment"
            className="mt-2 min-h-24"
            value={comment}
            onChange={(event) => setComment(event.target.value)}
          />
          <div className="mt-3 flex gap-3">
            <Button
              disabled={rejecting && comment.trim() === ''}
              onClick={() => setStage('confirm')}
            >
              Continue
            </Button>
            <Button variant="ghost" onClick={() => setStage('choose')}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {stage === 'confirm' && (
        <div className="mt-5 max-w-[640px] rounded-md border bg-muted/40 px-4 py-3">
          <p className="text-[14px] font-semibold">
            {rejecting ? 'Send this costing back?' : 'Approve this costing?'}
          </p>
          <p className="mt-1 text-[13.5px]">{consequence(row, decision)}</p>
          <p className="mt-2 text-[12.5px] text-muted-foreground">
            Recorded under your account, {who}, with the date and time.
          </p>
          <div className="mt-3 flex gap-3">
            <Button
              disabled={decide.isPending}
              onClick={() =>
                decide.mutate(
                  { stepId: row.step_id, decision, comment: comment.trim() },
                  {
                    onSuccess: (status) =>
                      onDecided({ title: budget.project_title, decision, status }),
                  },
                )
              }
            >
              {decide.isPending ? 'Recording…' : rejecting ? 'Confirm and reject' : 'Confirm and approve'}
            </Button>
            <Button variant="ghost" disabled={decide.isPending} onClick={() => setStage('compose')}>
              Back
            </Button>
          </div>
        </div>
      )}
    </Panel>
  )
}
