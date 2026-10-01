import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import type { RatesMoved } from '../versions/types'

/**
 * What a save or a restore did to the rates, and who was priced on the version
 * they moved away from (#142). Those costings keep their rates; this says what
 * can be done about each.
 */
export function RatesMovedNotice({
  moved,
  onSee,
  onDismiss,
}: {
  moved: RatesMoved
  onSee: (versionId: number) => void
  onDismiss: () => void
}) {
  const replaced = moved.replaced
  const affected = replaced ? replaced.in_review + replaced.approved : 0
  const costings = (n: number) => `${n} ${n === 1 ? 'costing' : 'costings'}`

  return (
    <Alert className="mb-4" role="status">
      <AlertTitle>{moved.title}</AlertTitle>
      <AlertDescription>
        <p>{moved.description}</p>
        {replaced && affected === 0 && (
          <p>
            No costing in review or approved was priced on version #
            {replaced.version_id}, the version replaced.
          </p>
        )}
        {replaced && affected > 0 && (
          <div className="mt-2 grid gap-1">
            <p>
              Priced on version #{replaced.version_id}, the version replaced:
            </p>
            <ul className="ml-4 list-disc">
              {replaced.in_review > 0 && (
                <li>
                  {costings(replaced.in_review)} in review: the approver can
                  reject it, giving the rates as the reason (“Rates changed
                  since this was submitted: please make a new draft from it and
                  resubmit”). The new draft takes the current rates.
                </li>
              )}
              {replaced.approved > 0 && (
                <li>
                  {costings(replaced.approved)} approved: the price is final and
                  does not change.
                </li>
              )}
            </ul>
          </div>
        )}
        <div className="mt-2 flex gap-2">
          {replaced && affected > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onSee(replaced.version_id)}
            >
              See them
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={onDismiss}>
            Dismiss
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  )
}
