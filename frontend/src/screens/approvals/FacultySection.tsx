import { PartBar } from '@/components/shell'
import type { ApprovalStepRecord } from '@/types'

import { DeanTriggers } from './DeanTriggers'
import { DecisionRecord } from './DecisionRecord'

interface FacultySectionProps {
  step: ApprovalStepRecord | undefined
  /** The server's reasons: frozen at submit, or the live ones for a draft. */
  triggers: string[]
  submitted: boolean
  faculty: string
}

/**
 * Part D. One faculty step produces one decision, so there is one record --
 * there is no school in the approval model, and no second signature (#83).
 */
export function FacultySection({ step, triggers, submitted, faculty }: FacultySectionProps) {
  return (
    <>
      <PartBar>PART D — Authorisation by Faculty</PartBar>

      {triggers.length > 0 ? (
        <DeanTriggers
          className="my-4"
          lead={
            submitted
              ? "The Dean's authorisation is required because"
              : "If submitted now, this costing will also need the Dean's authorisation, because"
          }
          triggers={triggers}
        />
      ) : (
        !submitted && (
          <p className="my-3 text-[13px] text-muted-foreground">
            As it stands, this costing needs no Dean: the Head of Department's
            authorisation will finish it.
          </p>
        )
      )}

      {submitted && <DecisionRecord title="Dean or delegate" step={step} missing={`${faculty} has no dean`} />}
    </>
  )
}
