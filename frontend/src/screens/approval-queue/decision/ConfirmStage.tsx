import type { Decision, QueueRow } from '@/api/approvals'
import { InlineConfirm } from '@/components/ui/inline-confirm'

import { consequence } from './consequence'

export function ConfirmStage({
  row,
  decision,
  who,
  pending,
  onConfirm,
  onBack,
}: {
  row: QueueRow
  decision: Decision
  who: string
  pending: boolean
  onConfirm: () => void
  onBack: () => void
}) {
  const rejecting = decision === 'reject'

  return (
    <div className="mt-5 max-w-[640px] rounded-md border bg-muted/40 px-4 py-3">
      <p className="text-[14px] font-semibold">
        {rejecting ? 'Send this costing back?' : 'Approve this costing?'}
      </p>
      <p className="mt-1 text-[13.5px]">{consequence(row, decision)}</p>
      <p className="mt-2 text-[12.5px] text-muted-foreground">
        Recorded under your account, {who}, with the date and time.
      </p>
      <InlineConfirm
        className="mt-3 gap-3"
        size="default"
        confirm={rejecting ? 'Confirm and reject' : 'Confirm and approve'}
        pendingLabel="Recording…"
        cancel="Back"
        pending={pending}
        onConfirm={onConfirm}
        onCancel={onBack}
      />
    </div>
  )
}
