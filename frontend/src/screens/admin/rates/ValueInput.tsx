import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { NumberInput } from '@/components/ui/number-input'
import type { ValueField } from '@/screens/admin/rateTables'
import { ConstantInput } from './ConstantInput'

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
  switch (field.kind) {
    case 'constant':
      return (
        <ConstantInput
          name={constant}
          value={Number(value)}
          label={label}
          onChange={onChange}
        />
      )
    case 'number':
      return (
        <NumberInput
          className="tabular ml-auto h-8 w-36 text-right"
          step={field.step}
          min={0}
          value={Number(value)}
          onChange={onChange}
          aria-label={label}
        />
      )
    case 'text':
      return (
        <Input
          className="h-8 min-w-48"
          value={String(value ?? '')}
          onChange={(event) => onChange(event.target.value)}
          aria-label={label}
        />
      )
    case 'boolean':
      return (
        <Checkbox
          checked={Boolean(value)}
          onCheckedChange={(next) => onChange(next === true)}
          aria-label={label}
        />
      )
  }
}
