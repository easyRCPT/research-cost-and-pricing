import { PartBar } from '@/components/shell'
import type { ApprovalStepRecord } from '@/types'
import { DecisionRecord } from './DecisionRecord'

export function DepartmentSection({
  step,
  department,
}: {
  step: ApprovalStepRecord | undefined
  department: string
}) {
  return (
    <>
      <PartBar>PART C — Authorisation by Department</PartBar>
      <DecisionRecord
        title="Head of Department"
        step={step}
        missing={`${department} has no head of department`}
      />
    </>
  )
}
