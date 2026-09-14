import { PartBar } from '@/components/shell'
import { SignatureBlock } from './SignatureBlock'

export function DepartmentSection() {
  return (
    <>
      <PartBar>PART C — Authorisation by Department</PartBar>
      <SignatureBlock title="Budget Form completed by:" />
      <SignatureBlock title="Head of Department Authorisation:" />
    </>
  )
}
