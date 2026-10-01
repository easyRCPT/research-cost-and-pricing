import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

export function ComposeStage({
  rejecting,
  comment,
  onCommentChange,
  onContinue,
  onCancel,
}: {
  rejecting: boolean
  comment: string
  onCommentChange: (comment: string) => void
  onContinue: () => void
  onCancel: () => void
}) {
  return (
    <div className="mt-5 max-w-[640px]">
      <label htmlFor="decision-comment" className="text-[13px] font-medium">
        {rejecting ? 'What has to change?' : 'Comment (optional)'}
      </label>
      <Textarea
        id="decision-comment"
        className="mt-2 min-h-24"
        value={comment}
        onChange={(event) => onCommentChange(event.target.value)}
      />
      <div className="mt-3 flex gap-3">
        <Button
          disabled={rejecting && comment.trim() === ''}
          onClick={onContinue}
        >
          Continue
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  )
}
