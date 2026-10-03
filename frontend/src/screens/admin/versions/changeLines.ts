import type { VersionChange } from '@/api/admin-lookups'
import {
  isRateTable,
  type RateTableSpec,
  tableSpec,
} from '@/screens/admin/rateTables'
import { keyText, shown, typed } from '@/screens/admin/stagedChanges'

export interface ChangeFigure {
  field: string
  before: string
  after: string
}

/** One change in a set: the row it named and the figures it touched. */
export interface ChangeLine {
  id: string
  name: string
  op: 'create' | 'update' | 'delete'
  figures: ChangeFigure[]
}

const rowName = (spec: RateTableSpec, key: Record<string, unknown>) =>
  spec.about?.(key).name ?? `${spec.label}: ${keyText(spec, key)}`

/** A logged value as the editor shows it; a field no longer in the spec shows as stored. */
function valueText(spec: RateTableSpec, field: string, value: unknown) {
  const known = spec.values.find((v) => v.field === field)
  if (!known) return value == null ? '' : String(value)
  return shown(known, typed(known, value))
}

export function changeLine(change: VersionChange, index: number): ChangeLine {
  const op = change.op as ChangeLine['op']
  if (!isRateTable(change.table))
    return {
      id: String(index),
      name: `${change.table}: ${JSON.stringify(change.key)}`,
      op,
      figures: [],
    }

  const spec = tableSpec(change.table)
  const touched = { ...change.before, ...change.after }
  const text = (side: VersionChange['before'], field: string) =>
    side && field in side ? valueText(spec, field, side[field]) : ''

  return {
    id: String(index),
    name: rowName(spec, change.key),
    op,
    // In the order the table lists its fields.
    figures: spec.values
      .filter((v) => v.field in touched)
      .map((v) => ({
        field: v.label,
        before: text(change.before, v.field),
        after: text(change.after, v.field),
      })),
  }
}
