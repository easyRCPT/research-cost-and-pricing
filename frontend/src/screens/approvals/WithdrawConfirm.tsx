import { Button } from '@/components/ui/button'

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
      <div className="mt-3 flex gap-2">
        <Button
          size="sm"
          variant="destructive"
          disabled={pending}
          onClick={onWithdraw}
        >
          {pending ? 'Withdrawing…' : 'Withdraw'}
        </Button>
        <Button size="sm" variant="ghost" disabled={pending} onClick={onCancel}>
          Keep it in review
        </Button>
      </div>
    </div>
  )
}
