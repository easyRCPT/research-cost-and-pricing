import { ExportPdfButton } from '@/components/shell'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { NotReady, useSubmitBudget } from '@/api/budget'
import { ApiError } from '@/lib/api'
import type { Status } from '@/types'

interface ApprovalActionsProps {
  status: Status
  /** The owner, on a draft. Everyone else only reads this screen. */
  canSubmit: boolean
}

export function ApprovalActions({ status, canSubmit }: ApprovalActionsProps) {
  const submit = useSubmitBudget()
  const error = submit.error

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

      <div className="mt-6 flex justify-end gap-3">
        <ExportPdfButton />
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
