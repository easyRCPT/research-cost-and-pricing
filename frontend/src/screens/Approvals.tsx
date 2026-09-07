import { useState } from 'react'
import { useBudget, useUpdateBudgetField } from '@/api/budget-lines'
import { Panel, PartBar } from '@/components/shell'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
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
  budgetId: number
  lookups: LookupTables
}

export function Approvals({ budgetId, lookups }: ApprovalsProps) {
  const { data: budget } = useBudget(budgetId)
  const updateBudgetField = useUpdateBudgetField(budgetId)
  const [drafts, setDrafts] = useState<Record<string, string>>({})

  const info = budget.budget_info
  const deanRequired = budget.budget_summary.dean_required
  const basis = fullRecoveryBasis(lookups)

  const valueOf = (
    field: 'justification' | 'justification_notes' | 'dean_exemption_reason',
  ) => drafts[field] ?? info[field]

  const commit = (
    field: 'justification' | 'justification_notes' | 'dean_exemption_reason',
  ) => {
    const value = drafts[field]
    if (value === undefined) return
    setDrafts((current) => {
      const next = { ...current }
      delete next[field]
      return next
    })
    if (value !== info[field]) {
      updateBudgetField.mutate({ field, value })
    }
  }

  const edit = (field: string, value: string) =>
    setDrafts((current) => ({ ...current, [field]: value }))

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
          <Input
            className="mt-2 max-w-[420px]"
            placeholder="Reason for the reduced multiplier"
            value={valueOf('justification')}
            onChange={(event) => edit('justification', event.target.value)}
            onBlur={() => commit('justification')}
          />
          <Textarea
            rows={3}
            className="mt-3 max-w-[760px]"
            placeholder="Additional information"
            value={valueOf('justification_notes')}
            onChange={(event) =>
              edit('justification_notes', event.target.value)
            }
            onBlur={() => commit('justification_notes')}
          />
        </div>

        <div className="mt-6">
          <div className="text-[13.5px] font-semibold">
            Reason authorisation is not required from a Dean or Dean's delegate:
          </div>
          <Textarea
            rows={3}
            className="mt-2 max-w-[760px]"
            value={valueOf('dean_exemption_reason')}
            onChange={(event) =>
              edit('dean_exemption_reason', event.target.value)
            }
            onBlur={() => commit('dean_exemption_reason')}
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
          onClick={() =>
            updateBudgetField.mutate({ field: 'status', value: 'submitted' })
          }
        >
          Submit for approval
        </Button>
      </div>
    </>
  )
}
