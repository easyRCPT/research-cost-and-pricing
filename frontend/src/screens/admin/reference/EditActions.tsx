import { InlineConfirm } from '@/components/ui/inline-confirm'

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
      <InlineConfirm
        confirm="Save"
        pendingLabel="Saving…"
        disabled={!canSave}
        pending={pending}
        onConfirm={onSave}
        onCancel={onCancel}
      />
    </div>
  )
}
