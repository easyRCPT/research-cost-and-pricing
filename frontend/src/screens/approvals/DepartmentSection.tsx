import { PartBar } from '@/components/shell'
import type { ApprovalStepRecord } from '@/types'
import { DecisionRecord } from './DecisionRecord'

export function DepartmentSection({
  step,
}: {
  step: ApprovalStepRecord | undefined
}) {
  return (
    <>
      <PartBar>PART C — Authorisation by Department</PartBar>
      <DecisionRecord title="Head of Department" step={step} />
    </>
  )
}
