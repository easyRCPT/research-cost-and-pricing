import { KINDS } from '@/screens/admin/fieldKinds'
import type { ValueField } from '@/screens/admin/rateTables'

export function ValueInput({
  field,
  value,
  constant,
  label,
  onChange,
}: {
  field: ValueField
  value: unknown
  /** The constant's name, for a `constant` field. */
  constant: string
  label: string
  onChange: (value: unknown) => void
}) {
  const Control = KINDS[field.kind].input
  return (
    Control && (
      <Control
        value={value}
        label={label}
        step={field.step}
        constant={constant}
        onChange={onChange}
      />
    )
  )
}
