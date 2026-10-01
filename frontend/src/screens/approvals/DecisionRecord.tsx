import { shortDate } from '@/lib/format/dates'
import type { ApprovalStepRecord } from '@/types'

/**
 * One authorisation, as the server recorded it.
 *
 * This replaces the ruled Signature / Name / Position / Date lines. Nothing is
 * signed here: the signed-in account, the decision and the server's timestamp
 * are the record. A step that has not been decided says who it is waiting on,
 * and says so plainly when nobody holds the role at all (#121).
 */
export function DecisionRecord({
  title,
  step,
  missing,
}: {
  title: string
  step: ApprovalStepRecord | undefined
  /** Said when nobody holds the role: "Science has no head of department". */
  missing: string
}) {
  return (
    <div className="my-4 rounded-md border px-4 py-3">
      <div className="text-[13.5px] font-semibold">{title}</div>
      <div className="mt-1 text-[13.5px]">
        <Outcome step={step} missing={missing} />
      </div>
      {step?.comment && (
        <p className="mt-2 border-l-2 pl-3 text-[13px] text-muted-foreground italic">
          {step.comment}
        </p>
      )}
    </div>
  )
}

function Outcome({ step, missing }: { step: ApprovalStepRecord | undefined; missing: string }) {
  if (!step) {
    return <span className="text-muted-foreground">Not submitted yet.</span>
  }

  switch (step.status) {
    case 'approved':
    case 'rejected':
      return (
        <span>
          <b className={step.status === 'rejected' ? 'text-destructive' : ''}>
            {step.status === 'approved' ? 'Approved' : 'Rejected'}
          </b>{' '}
          by {step.decided_by ?? 'an approver'}
          {step.decided_at && <> on {shortDate(step.decided_at)}</>}
        </span>
      )
    case 'not_required':
      return (
        <span className="text-muted-foreground">
          Not required for this costing.
        </span>
      )
    case 'pending':
      return step.waiting_on.length > 0 ? (
        <span>Waiting on {step.waiting_on.join(', ')}.</span>
      ) : (
        <span className="text-destructive">
          Waiting, but {missing} assigned, so nobody can decide it yet. Research,
          Innovation and Commercialisation can assign someone; it then reaches
          them with nothing more to do.
        </span>
      )
  }
}
