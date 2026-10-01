import { Link } from '@tanstack/react-router'

import { useBudget, useEditable, useField, useOwnsBudget } from '@/api/budget'
import { Panel } from '@/components/shell'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { shortDate } from '@/lib/format/dates'
import { isDraftStatus } from '@/lib/status'
import { DecisionPanel } from '@/screens/approval-queue/DecisionPanel'
import { ApprovalActions } from '@/screens/approvals/ApprovalActions'
import { ApprovalStatusBadge } from '@/screens/approvals/ApprovalStatusBadge'
import { DepartmentSection } from '@/screens/approvals/DepartmentSection'
import { FacultySection } from '@/screens/approvals/FacultySection'
import { JustificationFields } from '@/screens/approvals/JustificationFields'
import { useDecisionState } from '@/screens/approvals/useDecisionState'

/**
 * Submitting a costing, and following it through review.
 *
 * Everything shown is what the server returned. Submitting asks the server,
 * which creates the steps and decides whether a Dean is needed; the status,
 * the decisions and the reasons for a Dean are then read back, never
 * computed here (#83).
 */
const WHERE_IT_WENT: Record<string, string> = {
  dean_review: 'It has gone to the Dean for the second authorisation.',
  approved: 'It is approved. The price is final and can go to the funder.',
  rejected:
    'It has gone back to the researcher, who can revise it as a new draft.',
}

export function Approvals() {
  const { data: budget } = useBudget()
  const editable = useEditable()
  const owns = useOwnsBudget()
  const { decidable, decided, setDecided } = useDecisionState()
  const justification = useField('justification')
  const notes = useField('justification_notes')
  const exemption = useField('dean_exemption_reason')

  const status = budget.budget_info.status
  const { approval } = budget
  const submitted = !isDraftStatus(status)
  const step = (level: 'department' | 'faculty') =>
    approval.steps.find((candidate) => candidate.level === level)

  // Frozen at submit once it has gone; for a draft, what the engine says now.
  const triggers = submitted
    ? approval.dean_triggers
    : budget.budget_summary.dean_triggers

  return (
    <>
      <div className="mb-4 flex items-center justify-end gap-3">
        {approval.lookup_version && (
          <span className="text-[13px] text-muted-foreground">
            Priced on rates version #{approval.lookup_version}, locked at
            submission ·
          </span>
        )}
        {approval.submitted_at && (
          <span className="text-[13px] text-muted-foreground">
            Submitted {shortDate(approval.submitted_at)}
          </span>
        )}
        <ApprovalStatusBadge status={status} />
      </div>

      <Panel>
        <DepartmentSection
          step={step('department')}
          department={budget.project_info.department}
        />
        <FacultySection
          step={step('faculty')}
          faculty={budget.project_info.faculty}
          triggers={triggers}
          submitted={submitted}
        />
        <JustificationFields
          justification={justification}
          notes={notes}
          exemption={exemption}
          disabled={!editable}
        />
      </Panel>

      {decided && (
        <Alert className="mt-6" role="status">
          <AlertDescription>
            <b>
              You {decided.decision === 'reject' ? 'rejected' : 'approved'} this
              costing.
            </b>{' '}
            {WHERE_IT_WENT[decided.status] ?? `It is now ${decided.status}.`}{' '}
            <Link
              to="/approvals"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Back to your queue
            </Link>
          </AlertDescription>
        </Alert>
      )}
      {decidable && !decided && (
        <DecisionPanel row={decidable} onDecided={setDecided} />
      )}

      <ApprovalActions status={status} canSubmit={editable} owns={owns} />
    </>
  )
}
