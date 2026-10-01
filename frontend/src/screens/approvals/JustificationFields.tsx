import { TextareaInput,TextInput } from '@/components/ui/text-input'

type TextField = { value: string; onChange: (value: string) => void }

interface JustificationFieldsProps {
  justification: TextField
  notes: TextField
  exemption: TextField
  /** Frozen once submitted: what the approvers read is what was sent. */
  disabled: boolean
}

export function JustificationFields({
  justification,
  notes,
  exemption,
  disabled,
}: JustificationFieldsProps) {
  return (
    <>
      <div className="mt-6">
        <div className="text-[13.5px] text-muted-foreground">
          Reason for discounting or subsidising the project costs
        </div>
        <TextInput
          className="mt-2 max-w-[420px]"
          placeholder="Reason for the reduced price"
          disabled={disabled}
          {...justification}
        />
        <TextareaInput
          rows={3}
          className="mt-3 max-w-[760px]"
          placeholder="Additional information"
          disabled={disabled}
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
          disabled={disabled}
          {...exemption}
        />
      </div>
    </>
  )
}
