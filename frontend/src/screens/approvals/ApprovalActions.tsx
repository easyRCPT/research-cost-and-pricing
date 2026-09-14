import { ExportPdfButton } from '@/components/shell'
import { Button } from '@/components/ui/button'
import type { Status } from '@/types'

interface ApprovalActionsProps {
  status: Status
  onSubmit: () => void
}

export function ApprovalActions({ status, onSubmit }: ApprovalActionsProps) {
  return (
    <div className="mt-6 flex justify-end gap-3">
      <ExportPdfButton />
      <Button size="lg" disabled={status !== 'draft'} onClick={onSubmit}>
        Submit for approval
      </Button>
    </div>
  )
}
