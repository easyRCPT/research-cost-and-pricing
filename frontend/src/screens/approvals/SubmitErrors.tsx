import { useNavigate, useParams } from '@tanstack/react-router'

import { NotReady, useBudget } from '@/api/budget'
import { ApiErrorAlert } from '@/components/shell/ApiErrorAlert'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { ApiError } from '@/lib/api'
import { type ErrorTarget, reasonTarget } from '@/lib/submission-errors'
import { SCREEN_HEADINGS } from '@/screens'

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
  const { data: budget } = useBudget()
  const navigate = useNavigate()
  const { projectId } = useParams({ strict: false })

  const goTo = (target: ErrorTarget, reason: string) => {
    if (projectId === undefined) return
    navigate({
      to: '/projects/$projectId/$screen',
      params: { projectId, screen: target.screen },
      search: { focus: target.focus, error: reason },
    })
  }

  return (
    <>
      {error instanceof NotReady && (
        <Alert variant="destructive" className="mt-6">
          <AlertDescription>
            <b>This costing is not ready to submit yet.</b>
            <ul className="mt-1 space-y-1.5">
              {/*
                The server repeats a per-line reason once for each line, so
                several in-kind lines missing a reason would otherwise render
                the same sentence (and the same React key) more than once.
              */}
              {[...new Set(error.reasons)].map((reason) => {
                const target = reasonTarget(reason, budget)
                return (
                  <li
                    key={reason}
                    className="flex items-center justify-between gap-3"
                  >
                    <span>{reason}</span>
                    {target && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="shrink-0"
                        onClick={() => goTo(target, reason)}
                      >
                        Go to {SCREEN_HEADINGS[target.screen].title}
                      </Button>
                    )}
                  </li>
                )
              })}
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
