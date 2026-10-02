import { useState } from 'react'

import { type Decision, type QueueRow, useDecide } from '@/api/approvals'
import { useMe } from '@/api/auth'
import { Panel } from '@/components/shell'
import { ApiErrorAlert } from '@/components/shell/ApiErrorAlert'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ApiError } from '@/lib/api'
import { DeanTriggers } from '@/screens/approvals/DeanTriggers'

import { ChooseStage } from './decision/ChooseStage'
import { ComposeStage } from './decision/ComposeStage'
import { ConfirmStage } from './decision/ConfirmStage'
import { DecisionSummary } from './decision/DecisionSummary'

export interface Decided {
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
        onSuccess: (status) => onDecided({ decision, status }),
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
        <DeanTriggers
          className="mt-4"
          lead={
            row.level === 'faculty'
              ? 'This reached you because'
              : 'After you, the Dean also has to authorise this, because'
          }
          triggers={row.dean_triggers}
        />
      )}

      {tooLate && (
        <Alert className="mt-4">
          <AlertDescription>
            Someone else decided this first, so there is nothing left for you to
            sign. The queue has been refreshed.
          </AlertDescription>
        </Alert>
      )}
      {!tooLate && <ApiErrorAlert error={decide.error} className="mt-4" />}

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
