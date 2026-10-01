import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import type { RateTableSpec } from '@/screens/admin/rateTables'
import type { Key, Values } from '@/screens/admin/stagedChanges'

/** A new row, held with the rest of the set until it is saved. */
export function AddRateRow({
  spec,
  onAdd,
}: {
  spec: RateTableSpec
  onAdd: (key: Key, values: Values) => void
}) {
  const blank = (): Record<string, string | boolean> =>
    Object.fromEntries([
      ...spec.key.map((k) => [k.field, '']),
      ...spec.values.map((v) => [v.field, v.kind === 'boolean' ? false : '']),
    ])
  const [entered, setEntered] = useState(blank)
  const ready =
    spec.key.every(
      (k) => k.kind === 'number' || String(entered[k.field]).trim(),
    ) &&
    spec.values.every((v) => v.kind === 'boolean' || entered[v.field] !== '')

  const add = () => {
    const key: Key = {}
    for (const k of spec.key) {
      const raw = String(entered[k.field]).trim()
      key[k.field] =
        k.kind === 'number' ? (raw === '' ? null : Number(raw)) : raw || null
    }
    const values: Values = {}
    for (const v of spec.values) {
      const raw = entered[v.field]
      values[v.field] =
        v.kind === 'number'
          ? Number(raw)
          : v.kind === 'text'
            ? String(raw).trim()
            : raw
    }
    onAdd(key, values)
    setEntered(blank())
  }

  const fields = [...spec.key, ...spec.values]
  return (
    <div className="mt-5 border-t pt-4">
      <div className="mb-2 text-[13px] font-medium">Add a row</div>
      <div className="flex flex-wrap items-end gap-3">
        {fields.map((f) =>
          f.kind === 'boolean' ? (
            <label
              key={f.field}
              className="flex h-8 items-center gap-2 text-[12px] text-muted-foreground"
            >
              <Checkbox
                checked={entered[f.field] === true}
                onCheckedChange={(next) =>
                  setEntered({ ...entered, [f.field]: next === true })
                }
              />
              {f.label}
            </label>
          ) : (
            <label
              key={f.field}
              className="grid gap-1 text-[12px] text-muted-foreground"
            >
              {f.label}
              <Input
                className="h-8 w-40"
                type={f.kind === 'number' ? 'number' : 'text'}
                value={String(entered[f.field])}
                onChange={(event) =>
                  setEntered({ ...entered, [f.field]: event.target.value })
                }
              />
            </label>
          ),
        )}
        <Button size="sm" variant="outline" disabled={!ready} onClick={add}>
          Add
        </Button>
      </div>
    </div>
  )
}
