import { AddRowForm, type Entered } from '@/screens/admin/AddRowForm'
import { KINDS } from '@/screens/admin/fieldKinds'
import type { RateTableSpec } from '@/screens/admin/rateTables'
import type { Key, Values } from '@/screens/admin/stagedChanges'

const trimmed = (raw: string | boolean) =>
  typeof raw === 'string' ? raw.trim() : raw

/** A new row, held with the rest of the set until it is saved. */
export function AddRateRow({
  spec,
  onAdd,
}: {
  spec: RateTableSpec
  onAdd: (key: Key, values: Values) => void
}) {
  const ready = (entered: Entered) =>
    spec.key.every((k) => k.kind === 'number' || trimmed(entered[k.field])) &&
    spec.values.every((v) => v.kind === 'boolean' || entered[v.field] !== '')

  return (
    <AddRowForm
      title="Add a row"
      fields={[...spec.key, ...spec.values]}
      ready={ready}
      onAdd={(entered, clear) => {
        const key = Object.fromEntries(
          spec.key.map((k) => {
            const raw = trimmed(entered[k.field])
            return [k.field, raw === '' ? null : KINDS[k.kind].parse(raw)]
          }),
        )
        const values = Object.fromEntries(
          spec.values.map((v) => [
            v.field,
            KINDS[v.kind].parse(trimmed(entered[v.field])),
          ]),
        )
        onAdd(key, values)
        clear()
      }}
    />
  )
}
