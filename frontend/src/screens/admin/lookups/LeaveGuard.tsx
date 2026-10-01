import { Button } from '@/components/ui/button'
import { countText, type Staged } from '@/screens/admin/stagedChanges'

interface LeaveGuardProps {
  staged: Staged[]
  onLeave: () => void
  onStay: () => void
}

export function LeaveGuard({ staged, onLeave, onStay }: LeaveGuardProps) {
  return (
    <div
      role="alertdialog"
      aria-label="Unsaved changes"
      className="sticky bottom-4 z-10 mt-4 rounded-md border border-destructive/30 bg-card px-4 py-3 text-[13px] shadow-lg"
    >
      <p className="font-semibold text-destructive">Leave without saving?</p>
      <p className="mt-1">
        {countText(staged)} {staged.length === 1 ? 'has' : 'have'} not been
        saved, and will be lost.
      </p>
      <div className="mt-3 flex gap-2">
        <Button size="sm" variant="destructive" onClick={onLeave}>
          Leave without saving
        </Button>
        <Button size="sm" variant="ghost" onClick={onStay}>
          Stay
        </Button>
      </div>
    </div>
  )
}
