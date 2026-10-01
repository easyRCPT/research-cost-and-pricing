import type { Decision } from '@/api/approvals'
import { Button } from '@/components/ui/button'

export function ChooseStage({
  onChoose,
}: {
  onChoose: (decision: Decision) => void
}) {
  return (
    <div className="mt-5 flex flex-wrap gap-3">
      <Button onClick={() => onChoose('approve')}>Approve</Button>
      <Button
        variant="outline"
        className="border-destructive/40 text-destructive"
        onClick={() => onChoose('reject')}
      >
        Reject and send back
      </Button>
    </div>
  )
}
