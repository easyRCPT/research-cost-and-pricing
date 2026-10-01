import { Alert, AlertDescription } from '@/components/ui/alert'
import { ApiError } from '@/lib/api'

/** The server's message for a failed request; nothing if it was not an ApiError. */
export function ApiErrorAlert({
  error,
  variant = 'destructive',
  className,
}: {
  error: unknown
  variant?: 'default' | 'destructive'
  className?: string
}) {
  if (!(error instanceof ApiError)) return null
  return (
    <Alert variant={variant} className={className}>
      <AlertDescription>{error.message}</AlertDescription>
    </Alert>
  )
}
