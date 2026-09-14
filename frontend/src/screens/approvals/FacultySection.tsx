import { PartBar } from '@/components/shell'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { SignatureBlock } from './SignatureBlock'

interface FacultySectionProps {
  deanRequired: boolean
  note: string | undefined
}

export function FacultySection({ deanRequired, note }: FacultySectionProps) {
  return (
    <>
      <PartBar description={note}>
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
    </>
  )
}
