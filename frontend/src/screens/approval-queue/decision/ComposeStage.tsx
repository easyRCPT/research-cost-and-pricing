import { InlineConfirm } from '@/components/ui/inline-confirm'
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
      <InlineConfirm
        className="mt-3 gap-3"
        size="default"
        confirm="Continue"
        disabled={rejecting && comment.trim() === ''}
        onConfirm={onContinue}
        onCancel={onCancel}
      />
    </div>
  )
}
