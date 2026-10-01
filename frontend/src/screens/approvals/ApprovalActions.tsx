import { useState } from 'react'
import { useNavigate, useParams } from '@tanstack/react-router'
import { ExportPdfButton } from '@/components/shell'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { NotReady, useNewDraftFrom, useSubmitBudget, useWithdrawBudget } from '@/api/budget'
import { ApiError } from '@/lib/api'
import type { Status } from '@/types'

interface ApprovalActionsProps {
  status: Status
  /** The owner, on a draft. Everyone else only reads this screen. */
  canSubmit: boolean
  /** The owner, at any status: who may withdraw it or start again from it. */
  owns: boolean
}

const IN_REVIEW: Status[] = ['hod_review', 'dean_review']
const ENDED_UNAPPROVED: Status[] = ['rejected', 'withdrawn']

export function ApprovalActions({ status, canSubmit, owns }: ApprovalActionsProps) {
  const submit = useSubmitBudget()
  const withdraw = useWithdrawBudget()
  const newDraft = useNewDraftFrom()
  const navigate = useNavigate()
  const { projectId } = useParams({ strict: false })
  const [confirming, setConfirming] = useState(false)
  const error = submit.error

  const startAgain = () =>
    newDraft.mutate(undefined, {
      // The project now opens the new draft; start it from the beginning.
      onSuccess: () => {
        if (projectId !== undefined) {
          navigate({ to: '/projects/$projectId/$screen', params: { projectId, screen: 'details' } })
        }
      },
    })

  return (
    <>
      {error instanceof NotReady && (
        <Alert variant="destructive" className="mt-6">
          <AlertDescription>
            <b>This costing is not ready to submit yet.</b>
            <ul className="mt-1 list-disc pl-5">
              {error.reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
      {error instanceof ApiError && error.status === 409 && (
        <Alert className="mt-6">
          <AlertDescription>
            This costing has already been submitted.
          </AlertDescription>
        </Alert>
      )}
      {error instanceof ApiError && error.status !== 409 && (
        <Alert variant="destructive" className="mt-6">
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}
      {withdraw.error instanceof ApiError && (
        <Alert className="mt-6">
          <AlertDescription>{withdraw.error.message}</AlertDescription>
        </Alert>
      )}
      {newDraft.error instanceof ApiError && (
        <Alert variant="destructive" className="mt-6">
          <AlertDescription>{newDraft.error.message}</AlertDescription>
        </Alert>
      )}

      {owns && status === 'withdrawn' && (
        <Alert className="mt-6">
          <AlertDescription>
            You withdrew this costing from review. It stays here, read-only, as the
            record of what was submitted. To carry on, make a new draft from it.
          </AlertDescription>
        </Alert>
      )}

      {confirming && (
        <div
          role="alertdialog"
          aria-label="Withdraw from review"
          className="mt-6 rounded-md border border-destructive/30 bg-destructive/5 px-3.5 py-3 text-[13px]"
        >
          <p className="font-semibold text-destructive">Withdraw this costing from review?</p>
          <p className="mt-1">
            It leaves every approver&rsquo;s queue and stays here, read-only, as the record
            of what was submitted. This can&rsquo;t be undone: to carry on, you make a new
            draft from it and submit that.
          </p>
          <div className="mt-3 flex gap-2">
            <Button
              size="sm"
              variant="destructive"
              disabled={withdraw.isPending}
              onClick={() => withdraw.mutate(undefined, { onSettled: () => setConfirming(false) })}
            >
              {withdraw.isPending ? 'Withdrawing…' : 'Withdraw'}
            </Button>
            <Button size="sm" variant="ghost" disabled={withdraw.isPending} onClick={() => setConfirming(false)}>
              Keep it in review
            </Button>
          </div>
        </div>
      )}

      <div className="mt-6 flex justify-end gap-3">
        <ExportPdfButton />
        {owns && IN_REVIEW.includes(status) && !confirming && (
          <Button size="lg" variant="outline" onClick={() => setConfirming(true)}>
            Withdraw from review
          </Button>
        )}
        {owns && ENDED_UNAPPROVED.includes(status) && (
          <Button size="lg" disabled={newDraft.isPending} onClick={startAgain}>
            {newDraft.isPending ? 'Making a new draft…' : 'Make a new draft from it'}
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
