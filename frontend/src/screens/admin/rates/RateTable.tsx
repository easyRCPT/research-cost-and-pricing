import { Grid, Th } from '@/components/shell'
import { cn } from '@/lib/utils'
import type { RateTableSpec } from '@/screens/admin/rateTables'
import {
  idOf,
  keyOf,
  type Row,
  type Staged,
  stagedId,
  updateOf,
  upsert,
  valuesOf,
  without,
} from '@/screens/admin/stagedChanges'

import { RateRow } from './RateRow'
import type { Refused } from './types'

/** One rate table, with every change staged against it marked (#138). */
export function RateTable({
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
  const ofTable = staged.filter((change) => change.table === spec.id)
  const added = ofTable.filter((change) => change.op === 'create')

  return (
    <Grid>
      <thead>
        <tr>
          {spec.key.map((k) => (
            <Th key={k.field}>{k.label}</Th>
          ))}
          {spec.values.map((v) => (
            <Th
              key={v.field}
              className={cn(v.kind === 'number' && 'text-right')}
            >
              {v.label}
            </Th>
          ))}
          <Th />
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          const key = keyOf(spec, row)
          const id = stagedId(spec.id, key)
          const saved = valuesOf(spec, row)
          const change = ofTable.find((existing) => idOf(existing) === id)
          return (
            <RateRow
              key={id}
              spec={spec}
              rowKey={key}
              about={spec.about?.(row)}
              values={
                change?.op === 'update' ? { ...saved, ...change.value } : saved
              }
              was={change?.op === 'update' ? change.was : null}
              removed={change?.op === 'delete'}
              refusal={refused?.id === id ? refused.message : null}
              onChange={(edited) => {
                const update = updateOf(spec, key, saved, edited)
                onStage(update ? upsert(staged, update) : without(staged, id))
              }}
              onRemove={
                spec.removable === false
                  ? undefined
                  : () =>
                      onStage(
                        upsert(staged, {
                          op: 'delete',
                          table: spec.id,
                          key,
                          was: saved,
                        }),
                      )
              }
              onUndo={() => onStage(without(staged, id))}
            />
          )
        })}
        {added.map((change) => {
          const id = idOf(change)
          return (
            <RateRow
              key={`new-${id}`}
              spec={spec}
              rowKey={change.key}
              values={change.value}
              added
              refusal={refused?.id === id ? refused.message : null}
              onChange={(value) =>
                onStage(upsert(staged, { ...change, value }))
              }
              onUndo={() => onStage(without(staged, id))}
            />
          )
        })}
      </tbody>
    </Grid>
  )
}
