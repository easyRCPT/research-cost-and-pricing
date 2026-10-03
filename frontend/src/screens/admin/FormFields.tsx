import { cn } from '@/lib/utils'
import { FieldInput } from '@/screens/admin/FieldInput'
import { type FieldKind, KINDS } from '@/screens/admin/fieldKinds'
import { fieldError, type Refusal } from '@/screens/admin/reference/shared'

export type Entered = Record<string, string | boolean>

export interface FormField {
  field: string
  label: string
  kind: FieldKind
}

/** One labelled control per field, stacked, for a dialog. */
export function FormFields({
  fields,
  values,
  options = [],
  refusal = null,
  labelOf = (f) => f.label,
  onChange,
}: {
  fields: FormField[]
  values: Entered
  options?: { value: string; label: string }[]
  refusal?: Refusal | null
  /** The control's accessible name, when it should say more than the label. */
  labelOf?: (f: FormField) => string
  onChange: (field: string, value: string | boolean) => void
}) {
  return (
    <div className="grid gap-3">
      {fields.map((f) => {
        const inline = KINDS[f.kind].inline
        return (
          <label
            key={f.field}
            className={cn(
              'text-[12.5px] text-muted-foreground',
              inline ? 'flex items-center gap-2' : 'grid gap-1',
            )}
          >
            {!inline && f.label}
            <FieldInput
              kind={f.kind}
              value={values[f.field]}
              options={options}
              label={labelOf(f)}
              error={fieldError(refusal, f)}
              onChange={(value) => onChange(f.field, value)}
            />
            {inline && f.label}
          </label>
        )
      })}
    </div>
  )
}
