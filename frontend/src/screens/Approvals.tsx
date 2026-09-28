import { useBudget, useEditable, useField } from '@/api/budget'
import { Panel } from '@/components/shell'
import { ApprovalActions } from './approvals/ApprovalActions'
import { ApprovalStatusBadge } from './approvals/ApprovalStatusBadge'
import { shortDate } from '@/lib/format/dates'
import { DepartmentSection } from './approvals/DepartmentSection'
import { FacultySection } from './approvals/FacultySection'
import { JustificationFields } from './approvals/JustificationFields'

/**
 * Submitting a costing, and following it through review.
 *
 * Everything shown is what the server returned. Submitting asks the server,
 * which creates the steps and decides whether a Dean is needed; the status,
 * the decisions and the reasons for a Dean are then read back, never
 * computed here (#83).
 */
export function Approvals() {
  const { data: budget } = useBudget()
  const editable = useEditable()
  const justification = useField('justification')
  const notes = useField('justification_notes')
  const exemption = useField('dean_exemption_reason')

  const status = budget.budget_info.status
  const { approval } = budget
  const submitted = status !== 'draft'
  const step = (level: 'department' | 'faculty') =>
    approval.steps.find((candidate) => candidate.level === level)

  // Frozen at submit once it has gone; for a draft, what the engine says now.
  const triggers = submitted
    ? approval.dean_triggers
    : budget.budget_summary.dean_triggers

  return (
    <>
      <div className="mb-4 flex items-center justify-end gap-3">
        {approval.submitted_at && (
          <span className="text-[13px] text-muted-foreground">
            Submitted {shortDate(approval.submitted_at)}
          </span>
        )}
        <ApprovalStatusBadge status={status} />
      </div>

      <Panel>
        <DepartmentSection step={step('department')} />
        <FacultySection
          step={step('faculty')}
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

      <ApprovalActions status={status} canSubmit={editable} />
    </>
  )
}
