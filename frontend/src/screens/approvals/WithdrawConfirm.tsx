import { InlineConfirm } from '@/components/ui/inline-confirm'

export function WithdrawConfirm({
  pending,
  onWithdraw,
  onCancel,
}: {
  pending: boolean
  onWithdraw: () => void
  onCancel: () => void
}) {
  return (
    <div
      role="alertdialog"
      aria-label="Withdraw from review"
      className="mt-6 rounded-md border border-destructive/30 bg-destructive/5 px-3.5 py-3 text-[13px]"
    >
      <p className="font-semibold text-destructive">
        Withdraw this costing from review?
      </p>
      <p className="mt-1">
        It leaves every approver&rsquo;s queue and stays here, read-only, as the
        record of what was submitted. This can&rsquo;t be undone: to carry on,
        you make a new draft from it and submit that.
      </p>
      <InlineConfirm
        className="mt-3"
        confirm="Withdraw"
        pendingLabel="Withdrawing…"
        cancel="Keep it in review"
        variant="destructive"
        pending={pending}
        onConfirm={onWithdraw}
        onCancel={onCancel}
      />
    </div>
  )
}
