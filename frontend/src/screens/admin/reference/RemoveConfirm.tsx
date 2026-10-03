import { InlineConfirm } from '@/components/ui/inline-confirm'

export function RemoveConfirm({
  noun,
  name,
  pending,
  onConfirm,
  onCancel,
}: {
  noun: string
  name: string
  pending: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div role="alert" className="grid gap-2 text-[12.5px]">
      <span>
        Remove {noun} {name}? Nothing can use it afterwards.
      </span>
      <InlineConfirm
        confirm="Remove"
        variant="destructive"
        pending={pending}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    </div>
  )
}
