import { NotReady } from '@/api/budget'
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
        <Alert variant="destructive" className="mt-6">
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}
      {withdrawError instanceof ApiError && (
        <Alert className="mt-6">
          <AlertDescription>{withdrawError.message}</AlertDescription>
        </Alert>
      )}
      {newDraftError instanceof ApiError && (
        <Alert variant="destructive" className="mt-6">
          <AlertDescription>{newDraftError.message}</AlertDescription>
        </Alert>
      )}
    </>
  )
}
