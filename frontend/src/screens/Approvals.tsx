import { useBudget, useField, useSetBudgetField } from '@/api/budget'
import { Panel } from '@/components/shell'
import type { LookupTables } from '@/types'
import { ApprovalActions } from './approvals/ApprovalActions'
import { ApprovalStatusBadge } from './approvals/ApprovalStatusBadge'
import { JustificationFields } from './approvals/JustificationFields'
import { DepartmentSection } from './approvals/DepartmentSection'
import { FacultySection } from './approvals/FacultySection'

const fullRecoveryBasis = (lookups: LookupTables) =>
  lookups.calculation_constants.find(
    (constant) => constant.name === 'full_cost_recovery_multiplier',
  )?.value

export interface ApprovalsProps {
  lookups: LookupTables
}

export function Approvals({ lookups }: ApprovalsProps) {
  const { data: budget } = useBudget()
  const justification = useField('justification')
  const notes = useField('justification_notes')
  const exemption = useField('dean_exemption_reason')
  const setBudgetField = useSetBudgetField()

  const info = budget.budget_info
  const basis = fullRecoveryBasis(lookups)

  const partDNote = basis
    ? `Required if the cost recovery multiplier is less than ${basis.toFixed(2)}. The multiplier in use is ${info.cost_multiplier.toFixed(2)}.`
    : undefined

  return (
    <>
      <ApprovalStatusBadge status={info.status} />

      <Panel>
        <DepartmentSection />
        <FacultySection
          deanRequired={budget.budget_summary.dean_required}
          note={partDNote}
        />
        <JustificationFields
          justification={justification}
          notes={notes}
          exemption={exemption}
        />
      </Panel>

      <ApprovalActions
        status={info.status}
        onSubmit={() => setBudgetField('status', 'submitted')}
      />
    </>
  )
}
