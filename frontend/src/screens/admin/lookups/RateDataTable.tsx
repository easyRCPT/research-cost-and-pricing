import { useMemo } from 'react'

import {
  columnHelper,
  DataTable,
  type DataTableFilter,
} from '@/components/data-table'
import { AddRowDialog } from '@/screens/admin/AddRowDialog'
import { KINDS } from '@/screens/admin/fieldKinds'
import type { Entered } from '@/screens/admin/FormFields'
import { KeyCell, RowActions, ValueCell } from '@/screens/admin/rates/RateCells'
import { isChanged, type RateLine } from '@/screens/admin/rates/rateLine'
import type { Refused } from '@/screens/admin/rates/types'
import type { RateTableSpec } from '@/screens/admin/rateTables'
import {
  keyOf,
  keyShown,
  type Row,
  type Staged,
  stagedId,
  updateOf,
  upsert,
  valuesOf,
  without,
} from '@/screens/admin/stagedChanges'

/** A table with more rows than this gets a search and filters. */
const FILTER_FROM_ROWS = 15

const trimmed = (raw: string | boolean) =>
  typeof raw === 'string' ? raw.trim() : raw


function rateColumns(spec: RateTableSpec) {
  const col = columnHelper<RateLine>()
  // A table nothing is added to or removed from only ever needs an undo, which
  // sits under the edited value instead.
  const rowActions = spec.addable !== false || spec.removable !== false
  return col.columns([
    ...spec.key.map((k, i) =>
      col.accessor((line) => keyShown(k, line.key[k.field]), {
        id: k.field,
        header: k.label,
        cell: ({ row }) => (
          <KeyCell line={row.original} field={k} first={i === 0} />
        ),
      }),
    ),
    ...spec.values.map((v, i) =>
      col.display({
        id: v.field,
        header: v.label,
        cell: ({ row }) => (
          <ValueCell
            spec={spec}
            line={row.original}
            field={v}
            undo={!rowActions && i === 0}
          />
        ),
        meta: {
          align: KINDS[v.kind].align ? 'right' : undefined,
          // A figure is as wide as its field, so it sits by its header; text takes the room.
          className: v.kind === 'text' ? undefined : 'w-0',
        },
      }),
    ),
    ...(rowActions
      ? [
          col.display({
            id: 'actions',
            header: () => <span className="sr-only">Actions</span>,
            cell: ({ row }) => <RowActions spec={spec} line={row.original} />,
            meta: { className: 'w-0' },
          }),
        ]
      : []),
  ])
}

/** One rate table, with every change staged against it marked (#138). */
export function RateDataTable({
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
  // Built from the spec alone: a cell that changed with every edit would remount
  // its input and lose the caret.
  const columns = useMemo(() => rateColumns(spec), [spec])

  const filters = useMemo<DataTableFilter<RateLine>[]>(
    () =>
      spec.key.length > 1
        ? spec.key.map((k) => ({
            id: k.field,
            label: k.label,
            value: (line) => keyShown(k, line.key[k.field]),
          }))
        : [],
    [spec],
  )

  const ofTable = staged.filter((change) => change.table === spec.id)
  const refusalOf = (id: string) => (refused?.id === id ? refused : null)
  const searchOf = (line: Pick<RateLine, 'key' | 'about'>) =>
    [...spec.key.map((k) => line.key[k.field]), line.about?.name, line.about?.detail]
      .filter((part) => part !== null && part !== undefined)
      .join(' ')

  const added: RateLine[] = ofTable.flatMap((change) => {
    if (change.op !== 'create') return []
    const id = stagedId(spec.id, change.key)
    return [
      {
        key: change.key,
        values: change.value,
        was: null,
        added: true,
        removed: false,
        refusal: refusalOf(id),
        search: searchOf(change),
        onChange: (value) => onStage(upsert(staged, { ...change, value })),
        onUndo: () => onStage(without(staged, id)),
      },
    ]
  })

  const existing = rows.map((row): RateLine => {
    const key = keyOf(spec, row)
    const id = stagedId(spec.id, key)
    const saved = valuesOf(spec, row)
    const change = ofTable.find((c) => stagedId(c.table, c.key) === id)
    const about = spec.about?.(row)
    return {
      key,
      about,
      values: change?.op === 'update' ? { ...saved, ...change.value } : saved,
      was: change?.op === 'update' ? change.was : null,
      added: false,
      removed: change?.op === 'delete',
      refusal: refusalOf(id),
      search: searchOf({ key, about }),
      onChange: (edited) => {
        const update = updateOf(spec, key, saved, edited)
        onStage(update ? upsert(staged, update) : without(staged, id))
      },
      onRemove:
        spec.removable === false
          ? undefined
          : () =>
              onStage(upsert(staged, { op: 'delete', table: spec.id, key, was: saved })),
      onUndo: () => onStage(without(staged, id)),
    }
  })

  const ready = (entered: Entered) =>
    spec.key.every((k) => k.kind === 'number' || trimmed(entered[k.field])) &&
    spec.values.every((v) => v.kind === 'boolean' || entered[v.field] !== '')

  const add = (entered: Entered, done: () => void) => {
    const key = Object.fromEntries(
      spec.key.map((k) => {
        const raw = trimmed(entered[k.field])
        return [k.field, raw === '' ? null : KINDS[k.kind].parse(raw)]
      }),
    )
    const value = Object.fromEntries(
      spec.values.map((v) => [v.field, KINDS[v.kind].parse(trimmed(entered[v.field]))]),
    )
    onStage(upsert(staged, { op: 'create', table: spec.id, key, value }))
    done()
  }

  const long = rows.length > FILTER_FROM_ROWS

  return (
    <DataTable
      columns={columns}
      rows={[...added, ...existing]}
      getRowId={(line) => stagedId(spec.id, line.key)}
      searchable={long}
      filters={long ? filters : undefined}
      // A row with a change staged stays, so nothing is saved out of sight.
      keep={isChanged}
      rowProps={(line) => ({
        className: line.refusal
          ? 'bg-destructive/10'
          : isChanged(line)
            ? 'bg-amber-50'
            : undefined,
        'aria-invalid': line.refusal ? true : undefined,
      })}
      actions={
        spec.addable !== false && (
          <AddRowDialog
            title="Add row"
            fields={[...spec.key, ...spec.values]}
            ready={ready}
            onAdd={add}
          />
        )
      }
    />
  )
}
