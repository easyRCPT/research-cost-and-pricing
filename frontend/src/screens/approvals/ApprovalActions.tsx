import { useState } from 'react'
import { useNavigate, useParams } from '@tanstack/react-router'
import { ExportPdfButton } from '@/components/shell'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  useNewDraftFrom,
  useSubmitBudget,
  useWithdrawBudget,
} from '@/api/budget'
import type { Status } from '@/types'
import { SubmitErrors } from './SubmitErrors'
import { WithdrawConfirm } from './WithdrawConfirm'

interface ApprovalActionsProps {
  status: Status
  /** The owner, on a draft. Everyone else only reads this screen. */
  canSubmit: boolean
  /** The owner, at any status: who may withdraw it or start again from it. */
  owns: boolean
}

const IN_REVIEW: Status[] = ['hod_review', 'dean_review']
const ENDED_UNAPPROVED: Status[] = ['rejected', 'withdrawn']

export function ApprovalActions({
  status,
  canSubmit,
  owns,
}: ApprovalActionsProps) {
  const submit = useSubmitBudget()
  const withdraw = useWithdrawBudget()
  const newDraft = useNewDraftFrom()
  const navigate = useNavigate()
  const { projectId } = useParams({ strict: false })
  const [confirming, setConfirming] = useState(false)

  const startAgain = () =>
    newDraft.mutate(undefined, {
      // The project now opens the new draft; start it from the beginning.
      onSuccess: () => {
        if (projectId !== undefined) {
          navigate({
            to: '/projects/$projectId/$screen',
            params: { projectId, screen: 'details' },
          })
        }
      },
    })

  return (
    <>
      <SubmitErrors
        submitError={submit.error}
        withdrawError={withdraw.error}
        newDraftError={newDraft.error}
      />

      {owns && status === 'withdrawn' && (
        <Alert className="mt-6">
          <AlertDescription>
            You withdrew this costing from review. It stays here, read-only, as
            the record of what was submitted. To carry on, make a new draft from
            it.
          </AlertDescription>
        </Alert>
      )}

      {confirming && (
        <WithdrawConfirm
          pending={withdraw.isPending}
          onWithdraw={() =>
            withdraw.mutate(undefined, {
              onSettled: () => setConfirming(false),
            })
          }
          onCancel={() => setConfirming(false)}
        />
      )}

      <div className="mt-6 flex justify-end gap-3">
        <ExportPdfButton />
        {owns && IN_REVIEW.includes(status) && !confirming && (
          <Button
            size="lg"
            variant="outline"
            onClick={() => setConfirming(true)}
          >
            Withdraw from review
          </Button>
        )}
        {owns && ENDED_UNAPPROVED.includes(status) && (
          <Button size="lg" disabled={newDraft.isPending} onClick={startAgain}>
            {newDraft.isPending
              ? 'Making a new draft…'
              : 'Make a new draft from it'}
          </Button>
        )}
        {status === 'draft' && canSubmit && (
          <Button
            size="lg"
            disabled={submit.isPending}
            onClick={() => submit.mutate()}
          >
            {submit.isPending ? 'Submitting…' : 'Submit for approval'}
          </Button>
        )}
      </div>
    </>
  )
}
