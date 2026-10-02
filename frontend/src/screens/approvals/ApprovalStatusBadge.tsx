import { Badge } from '@/components/ui/badge'
import { AWAITING_LABELS } from '@/lib/status'
import type { Status } from '@/types'

interface ApprovalStatusBadgeProps {
  status: Status
}

export function ApprovalStatusBadge({ status }: ApprovalStatusBadgeProps) {
  return (
    <Badge variant={status === 'rejected' ? 'destructive' : 'secondary'}>
      {AWAITING_LABELS[status]}
    </Badge>
  )
}
