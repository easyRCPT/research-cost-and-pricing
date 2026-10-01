import { Link, useParams } from '@tanstack/react-router'

import { useBudget, useBudgetId, useEditable } from '@/api/budget'
import { useDecidableStep } from '@/api/decidable'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { isDraftStatus } from '@/lib/status'

const STATE: Record<string, string> = {
  submitted: 'has been submitted for review',
  hod_review: 'is with the Head of Department',
  dean_review: 'is with the Dean',
  approved: 'has been approved',
  rejected: 'was rejected',
  withdrawn: 'was withdrawn',
}

/**
 * Says why nothing on the screen can be changed, before anyone tries.
 *
 * The server refuses the write either way (#77); this is so the screen does not
 * offer an edit it knows will be refused (#83).
 */
export function ReadOnlyNotice() {
  const { data: budget } = useBudget()
  const editable = useEditable()
  const decidable = useDecidableStep(useBudgetId())
  const { projectId, screen } = useParams({ strict: false }) as {
    projectId?: number
    screen?: string
  }
  if (editable) return null

  // Someone asked to authorise it: say where the decision is, from any screen.
  if (decidable) {
    return (
      <Alert className="mb-4">
        <AlertDescription>
          <b>This costing is waiting on your authorisation.</b> Every screen is
          read-only, so you can go through the whole calculation.{' '}
          {screen === 'approvals' ? (
            'Your decision is below.'
          ) : (
            projectId !== undefined && (
              <Link
                to="/projects/$projectId/$screen"
                params={{ projectId, screen: 'approvals' }}
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                Decide on the Approvals screen
              </Link>
            )
          )}
        </AlertDescription>
      </Alert>
    )
  }

  const status = budget.budget_info.status
  const why =
    isDraftStatus(status)
      ? 'This costing belongs to someone else, so you are reading it.'
      : `This costing ${STATE[status] ?? 'is not a draft'}, so it is read-only.`

  return (
    <Alert className="mb-4">
      <AlertDescription>{why}</AlertDescription>
    </Alert>
  )
}
