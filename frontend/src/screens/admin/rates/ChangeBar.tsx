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
      className="fixed bottom-6 left-1/2 z-40 flex w-max max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-3 rounded-full border bg-card py-1.5 pr-1.5 pl-4 text-[13px] shadow-lg print:hidden"
    >
      <span className="font-medium">{countText(staged)}</span>
      <div className="flex shrink-0 gap-1">
        <Button
          size="sm"
          variant="ghost"
          className="rounded-full"
          onClick={onDiscard}
        >
          Discard all
        </Button>
        <Button size="sm" className="rounded-full" onClick={onReview}>
          Review changes
        </Button>
      </div>
    </div>
  )
}
