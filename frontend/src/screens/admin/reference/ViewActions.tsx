import { Button } from '@/components/ui/button'

export function ViewActions({
  name,
  removable,
  onEdit,
  onRemove,
}: {
  name: string
  removable: boolean
  onEdit: () => void
  onRemove: () => void
}) {
  return (
    <div className="flex gap-2">
      <Button
        size="sm"
        variant="ghost"
        onClick={onEdit}
        aria-label={`Edit ${name}`}
      >
        Edit
      </Button>
      {removable && (
        <Button
          size="sm"
          variant="ghost"
          onClick={onRemove}
          aria-label={`Remove ${name}`}
        >
          Remove
        </Button>
      )}
    </div>
  )
}
