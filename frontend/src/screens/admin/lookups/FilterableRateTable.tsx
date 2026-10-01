import { useState } from 'react'

import { FILTER_FROM_ROWS, matchesFilter } from '@/screens/admin/rates/filterRows'
import { RateFilter } from '@/screens/admin/rates/RateFilter'
import { RateTable as RateTableView } from '@/screens/admin/rates/RateTable'
import type { Refused } from '@/screens/admin/rates/types'
import type { RateTableSpec } from '@/screens/admin/rateTables'
import {
  keyOf,
  type Row,
  type Staged,
  stagedId,
} from '@/screens/admin/stagedChanges'

/** A rate table with a filter above it once it is long; the filter lasts as long as the table is open. */
export function FilterableRateTable({
  spec,
  rows,
  staged,
  refused,
  onStage,
}: {
  spec: RateTableSpec
  rows: Row[]
  staged: Staged[]
  refused: Refused
  onStage: (next: Staged[]) => void
}) {
  const [query, setQuery] = useState('')
  const filterable = rows.length > FILTER_FROM_ROWS

  // A row with a change staged stays, so nothing is saved out of sight.
  const changed = new Set(
    staged.filter((c) => c.table === spec.id).map((c) => stagedId(spec.id, c.key)),
  )
  const shown = filterable
    ? rows.filter(
        (row) =>
          matchesFilter(spec, row, query) ||
          changed.has(stagedId(spec.id, keyOf(spec, row))),
      )
    : rows
  const nothingShown =
    filterable &&
    shown.length === 0 &&
    !staged.some((c) => c.table === spec.id && c.op === 'create')

  return (
    <>
      {filterable && <RateFilter spec={spec} onFilter={setQuery} />}
      {nothingShown ? (
        <p className="py-6 text-center text-[13px] text-muted-foreground">
          No rows match “{query.trim()}”.
        </p>
      ) : (
        <RateTableView
          spec={spec}
          rows={shown}
          staged={staged}
          refused={refused}
          onStage={onStage}
        />
      )}
    </>
  )
}
