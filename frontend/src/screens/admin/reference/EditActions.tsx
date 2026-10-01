import { Button } from '@/components/ui/button'

export function EditActions({
  renamed,
  canSave,
  pending,
  onSave,
  onCancel,
}: {
  renamed: boolean
  canSave: boolean
  pending: boolean
  onSave: () => void
  onCancel: () => void
}) {
  return (
    <div className="grid gap-2 text-[12.5px]">
      {renamed && (
        <p className="text-muted-foreground">
          Costings already approved will show the new name: names aren't
          versioned. The audit log keeps the old one.
        </p>
      )}
      <div className="flex gap-2">
        <Button size="sm" disabled={!canSave || pending} onClick={onSave}>
          {pending ? 'Saving…' : 'Save'}
        </Button>
        <Button size="sm" variant="ghost" disabled={pending} onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  )
}
