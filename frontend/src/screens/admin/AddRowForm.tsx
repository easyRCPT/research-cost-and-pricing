import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { FieldInput } from '@/screens/admin/FieldInput'
import { type FieldKind, KINDS } from '@/screens/admin/fieldKinds'
import { fieldError, type Refusal } from '@/screens/admin/reference/shared'

export type Entered = Record<string, string | boolean>

/**
 * A form for a new row of any table: one control per field, by its kind.
 * `onAdd` gets what was typed and a `clear` to call once the row is taken.
 */
export function AddRowForm({
  title,
  fields,
  options = [],
  ready,
  pending = false,
  refusal = null,
  onAdd,
}: {
  title: string
  fields: { field: string; label: string; kind: FieldKind }[]
  options?: { value: string; label: string }[]
  ready: (entered: Entered) => boolean
  pending?: boolean
  refusal?: Refusal | null
  onAdd: (entered: Entered, clear: () => void) => void
}) {
  const blank = (): Entered =>
    Object.fromEntries(fields.map((f) => [f.field, KINDS[f.kind].blank]))
  const [entered, setEntered] = useState(blank)

  // A row can be half typed by the time a save lands: clear only what was sent.
  const clear = () => setEntered((current) => (current === entered ? blank() : current))

  return (
    <div className="mt-5 border-t pt-4">
      <div className="mb-2 text-[13px] font-medium">{title}</div>
      <div className="flex flex-wrap items-start gap-3">
        {fields.map((f) => {
          const inline = KINDS[f.kind].inline
          return (
            <label
              key={f.field}
              className={cn(
                'text-[12px] text-muted-foreground',
                inline ? 'mt-5 flex h-8 items-center gap-2' : 'grid gap-1',
              )}
            >
              {!inline && f.label}
              <FieldInput
                kind={f.kind}
                value={entered[f.field]}
                options={options}
                label={f.label}
                error={fieldError(refusal, f)}
                onChange={(value) => setEntered({ ...entered, [f.field]: value })}
              />
              {inline && f.label}
            </label>
          )
        })}
        <Button
          size="sm"
          variant="outline"
          className="mt-5"
          disabled={!ready(entered) || pending}
          onClick={() => onAdd(entered, clear)}
        >
          {pending ? 'Adding…' : 'Add'}
        </Button>
      </div>
      {refusal && Object.keys(refusal.fields).length === 0 && (
        <p className="mt-2 text-[12.5px] text-destructive">{refusal.message}</p>
      )}
    </div>
  )
}
