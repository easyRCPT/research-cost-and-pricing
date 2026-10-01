import type { RateTableSpec } from '@/screens/admin/rateTables'
import type { Row } from '@/screens/admin/stagedChanges'

/** A table with more rows than this gets a filter. */
export const FILTER_FROM_ROWS = 15

/** "Filter by payroll, category…", from the labels of the fields that name a row. */
export const filterPlaceholder = (spec: RateTableSpec) =>
  `Filter by ${spec.key.map((k) => k.label.toLowerCase()).join(', ')}…`

/** Whether every word typed appears in the row's key fields or its name. */
export function matchesFilter(spec: RateTableSpec, row: Row, query: string) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (words.length === 0) return true

  const about = spec.about?.(row)
  const text = [
    ...spec.key.map((k) => row[k.field]),
    about?.name,
    about?.detail,
  ]
    .filter((part) => part !== null && part !== undefined)
    .join(' ')
    .toLowerCase()

  return words.every((word) => text.includes(word))
}
