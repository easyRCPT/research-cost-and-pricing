import { NotReady } from '@/api/budget'
import { ApiErrorAlert } from '@/components/shell/ApiErrorAlert'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ApiError } from '@/lib/api'

interface SubmitErrorsProps {
  submitError: Error | null
  withdrawError: Error | null
  newDraftError: Error | null
}

export function SubmitErrors({
  submitError: error,
  withdrawError,
  newDraftError,
}: SubmitErrorsProps) {
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
        <ApiErrorAlert error={error} className="mt-6" />
      )}
      <ApiErrorAlert error={withdrawError} variant="default" className="mt-6" />
      <ApiErrorAlert error={newDraftError} className="mt-6" />
    </>
  )
}
