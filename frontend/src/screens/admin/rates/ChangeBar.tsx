import { Button } from '@/components/ui/button'
import { countText, type Staged } from '@/screens/admin/stagedChanges'

export function ChangeBar({
  staged,
  onDiscard,
  onReview,
}: {
  staged: Staged[]
  onDiscard: () => void
  onReview: () => void
}) {
  return (
    <div
      role="region"
      aria-label="Unsaved changes"
      className="sticky bottom-4 z-10 mt-4 flex flex-wrap items-center gap-3 rounded-lg border bg-card px-4 py-3 text-[13px] shadow-lg"
    >
      <span className="font-medium">{countText(staged)}</span>
      <div className="ml-auto flex gap-2">
        <Button size="sm" variant="ghost" onClick={onDiscard}>
          Discard all
        </Button>
        <Button size="sm" onClick={onReview}>
          Review changes
        </Button>
      </div>
    </div>
  )
}
