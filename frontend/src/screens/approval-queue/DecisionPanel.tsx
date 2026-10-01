import { useState } from 'react'

import { type Decision, type QueueRow,useDecide } from '@/api/approvals'
import { useMe } from '@/api/auth'
import { Panel } from '@/components/shell'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ApiError } from '@/lib/api'
import { describeTrigger } from '@/screens/approvals/triggers'

import { ChooseStage } from './decision/ChooseStage'
import { ComposeStage } from './decision/ComposeStage'
import { ConfirmStage } from './decision/ConfirmStage'
import { DecisionSummary } from './decision/DecisionSummary'

export interface Decided {
  title: string
  decision: Decision
  /** Where the server moved the budget: dean_review, approved or rejected. */
  status: string
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
  const who = me
    ? `${me.user.first_name} ${me.user.last_name}`.trim() || me.user.email
    : ''

  const tooLate =
    decide.error instanceof ApiError && decide.error.status === 409

  const choose = (choice: Decision) => {
    setDecision(choice)
    setStage('compose')
  }

  const confirm = () =>
    decide.mutate(
      { stepId: row.step_id, decision, comment: comment.trim() },
      {
        onSuccess: (status) =>
          onDecided({ title: budget.project_title, decision, status }),
      },
    )

  return (
    <Panel
      title={
        row.level === 'faculty'
          ? 'Your authorisation, as Dean'
          : 'Your authorisation, as Head of Department'
      }
      className="mt-6"
    >
      <DecisionSummary budget={budget} />

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
        salary rate or an on-cost reprices new work only, so what you decide on
        is what it stays. Every screen of the costing is open to you in the
        rail, read-only.
      </p>

      {tooLate && (
        <Alert className="mt-4">
          <AlertDescription>
            Someone else decided this first, so there is nothing left for you to
            sign. The queue has been refreshed.
          </AlertDescription>
        </Alert>
      )}
      {decide.error instanceof ApiError && !tooLate && (
        <Alert variant="destructive" className="mt-4">
          <AlertDescription>{decide.error.message}</AlertDescription>
        </Alert>
      )}

      {stage === 'choose' && !tooLate && <ChooseStage onChoose={choose} />}

      {stage === 'compose' && (
        <ComposeStage
          rejecting={rejecting}
          comment={comment}
          onCommentChange={setComment}
          onContinue={() => setStage('confirm')}
          onCancel={() => setStage('choose')}
        />
      )}

      {stage === 'confirm' && (
        <ConfirmStage
          row={row}
          decision={decision}
          who={who}
          pending={decide.isPending}
          onConfirm={confirm}
          onBack={() => setStage('compose')}
        />
      )}
    </Panel>
  )
}
