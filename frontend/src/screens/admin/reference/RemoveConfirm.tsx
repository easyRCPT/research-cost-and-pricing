import { Button } from '@/components/ui/button'

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
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="destructive"
          disabled={pending}
          onClick={onConfirm}
        >
          Remove
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  )
}
