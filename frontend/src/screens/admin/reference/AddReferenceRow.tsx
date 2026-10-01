import { useState } from 'react'
import { toast } from 'sonner'
import { useReferenceWrite } from '@/api/admin-lookups'
import { Button } from '@/components/ui/button'
import { FieldInput } from '@/screens/admin/reference/FieldInput'
import {
  refusalOf,
  type Faculty,
  type Refusal,
} from '@/screens/admin/reference/shared'
import type { ReferenceTableSpec } from '@/screens/admin/referenceTables'

export function AddReferenceRow({
  spec,
  faculties,
}: {
  spec: ReferenceTableSpec
  faculties: Faculty[]
}) {
  const write = useReferenceWrite()
  const blank = () =>
    Object.fromEntries([spec.key, ...spec.fields].map((f) => [f.field, '']))
  const [values, setValues] = useState<Record<string, string>>(blank)
  const [refusal, setRefusal] = useState<Refusal | null>(null)
  const ready = values[spec.key.field].trim() !== ''

  const add = () => {
    const submitted = values
    write.mutate(
      {
        op: 'create',
        table: spec.id,
        values: Object.fromEntries(
          Object.entries(submitted).map(([field, value]) => [
            field,
            value.trim(),
          ]),
        ),
      },
      {
        onSuccess: () => {
          toast.success(
            `${spec.noun[0].toUpperCase()}${spec.noun.slice(1)} added`,
            { description: submitted[spec.key.field] },
          )
          // Success lands once the list has caught up, by which time the next
          // row may be half typed: clear only what was sent.
          setValues((current) => (current === submitted ? blank() : current))
          setRefusal(null)
        },
        onError: (error) => setRefusal(refusalOf(error)),
      },
    )
  }

  return (
    <div className="mt-5 border-t pt-4">
      <div className="mb-2 text-[13px] font-medium">
        Add {spec.noun === 'activity' ? 'an' : 'a'} {spec.noun}
      </div>
      <div className="flex flex-wrap items-start gap-3">
        {[spec.key, ...spec.fields].map((f) => (
          <label
            key={f.field}
            className="grid gap-1 text-[12px] text-muted-foreground"
          >
            {f.label}
            <FieldInput
              field={f}
              value={values[f.field]}
              faculties={faculties}
              label={f.label}
              error={
                refusal?.fields[f.field] ??
                (f.kind === 'faculty' ? refusal?.fields.faculty : undefined)
              }
              onChange={(value) => setValues({ ...values, [f.field]: value })}
            />
          </label>
        ))}
        <Button
          size="sm"
          variant="outline"
          className="mt-5"
          disabled={!ready || write.isPending}
          onClick={add}
        >
          {write.isPending ? 'Adding…' : 'Add'}
        </Button>
      </div>
      {refusal && Object.keys(refusal.fields).length === 0 && (
        <p className="mt-2 text-[12.5px] text-destructive">{refusal.message}</p>
      )}
    </div>
  )
}
