import { Badge } from '@/components/ui/badge'
import type { Status } from '@/types'

const STATUS_LABEL: Record<Status, string> = {
  draft: 'Draft',
  submitted: 'Awaiting Head of Department',
  hod_review: 'Awaiting Head of Department',
  dean_review: 'Awaiting Dean',
  approved: 'Approved',
  withdrawn: 'Withdrawn',
}

interface ApprovalStatusBadgeProps {
  status: Status
}

export function ApprovalStatusBadge({ status }: ApprovalStatusBadgeProps) {
  return (
    <div className="mb-4 flex justify-end">
      <Badge variant="secondary">{STATUS_LABEL[status]}</Badge>
    </div>
  )
}
