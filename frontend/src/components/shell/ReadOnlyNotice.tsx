import { Alert, AlertDescription } from '@/components/ui/alert'
import { useBudget, useEditable } from '@/api/budget'

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
  if (editable) return null

  const status = budget.budget_info.status
  const why =
    status === 'draft'
      ? 'This costing belongs to someone else, so you are reading it.'
      : `This costing ${STATE[status] ?? 'is not a draft'}, so it is read-only.`

  return (
    <Alert className="mb-4">
      <AlertDescription>{why}</AlertDescription>
    </Alert>
  )
}
