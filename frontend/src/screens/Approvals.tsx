import { useBudget, useField, useSetBudgetField } from '@/api/budget'
import { Panel, PartBar } from '@/components/shell'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TextInput, TextareaInput } from '@/components/ui/text-input'
import type { LookupTables, Status } from '@/types'

const STATUS_LABEL: Record<Status, string> = {
  draft: 'Draft',
  submitted: 'Awaiting Head of Department',
  hod_review: 'Awaiting Head of Department',
  dean_review: 'Awaiting Dean',
  approved: 'Approved',
  withdrawn: 'Withdrawn',
}

const SIGNATURE_LABELS = [
  'Signature',
  'Name (please print)',
  'Position (please print)',
  'Date',
]

function SignatureBlock({ title }: { title: string }) {
  return (
    <div className="mt-4">
      <div className="text-[13.5px] font-semibold">{title}</div>
      <div className="mt-3 grid grid-cols-2 gap-5 md:grid-cols-4">
        {SIGNATURE_LABELS.map((label) => (
          <div key={label}>
            <div className="h-10 border-b border-neutral-400" />
            <span className="text-[12.5px] text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

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
  const deanRequired = budget.budget_summary.dean_required
  const basis = fullRecoveryBasis(lookups)

  const partDNote = basis
    ? `Required if the cost recovery multiplier is less than ${basis.toFixed(2)}. The multiplier in use is ${info.cost_multiplier.toFixed(2)}.`
    : undefined

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Badge variant="secondary">{STATUS_LABEL[info.status]}</Badge>
      </div>

      <Panel>
        <PartBar>PART C — Authorisation by Department</PartBar>
        <SignatureBlock title="Budget Form completed by:" />
        <SignatureBlock title="Head of Department Authorisation:" />

        <PartBar description={partDNote}>
          PART D — Authorisation by Faculty / School
        </PartBar>

        {deanRequired && (
          <Alert className="mb-4">
            <AlertDescription>
              <b>Dean's authorisation is required for this project.</b> The cost
              recovery multiplier is below the University default.
            </AlertDescription>
          </Alert>
        )}

        <SignatureBlock title="Faculty / School Authorisation #1:" />
        <SignatureBlock title="Faculty / School Authorisation #2:" />

        <div className="mt-6">
          <div className="text-[13.5px] text-muted-foreground">
            Reason for discounting or subsidising the project costs
          </div>
          <TextInput
            className="mt-2 max-w-[420px]"
            placeholder="Reason for the reduced multiplier"
            {...justification}
          />
          <TextareaInput
            rows={3}
            className="mt-3 max-w-[760px]"
            placeholder="Additional information"
            {...notes}
          />
        </div>

        <div className="mt-6">
          <div className="text-[13.5px] font-semibold">
            Reason authorisation is not required from a Dean or Dean's delegate:
          </div>
          <TextareaInput
            rows={3}
            className="mt-2 max-w-[760px]"
            {...exemption}
          />
        </div>
      </Panel>

      <div className="mt-6 flex justify-end gap-3">
        <Button variant="outline" size="lg" onClick={() => window.print()}>
          Export PDF
        </Button>
        <Button
          size="lg"
          disabled={info.status !== 'draft'}
          onClick={() => setBudgetField('status', 'submitted')}
        >
          Submit for approval
        </Button>
      </div>
    </>
  )
}
