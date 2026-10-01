import type { LookupChange, RateTable } from '@/api/admin-lookups'
import { ApiError } from '@/lib/api'

import { KINDS } from './fieldKinds'
import { type RateTableSpec, tableSpec, type ValueField } from './rateTables'

export type Row = Record<string, unknown>
export type Key = Record<string, unknown>
export type Values = Record<string, unknown>

/**
 * An edit held on screen until the set is saved (#138). Screen state only:
 * what was typed and what it said before, so the review can show old → new.
 * Whether a change is allowed is the server's to say when the set is saved.
 *
 * An update holds only the fields that differ from the saved row, and `was`
 * holds what those fields said before.
 */
export type Staged =
  | { op: 'update'; table: RateTable; key: Key; was: Values; value: Values }
  | { op: 'create'; table: RateTable; key: Key; value: Values }
  | { op: 'delete'; table: RateTable; key: Key; was: Values }

export const keyOf = (spec: RateTableSpec, row: Row): Key =>
  Object.fromEntries(spec.key.map((k) => [k.field, row[k.field] ?? null]))

/** A row's figures, typed as the inputs hold them. */
export const valuesOf = (spec: RateTableSpec, row: Row): Values =>
  Object.fromEntries(spec.values.map((v) => [v.field, typed(v, row[v.field])]))

export const typed = (field: ValueField, raw: unknown) => KINDS[field.kind].parse(raw)

/** A field's value as the review and the "was" line show it. */
export const shown = (field: ValueField, value: unknown) => KINDS[field.kind].show(value)

/** "Fortnight · Academic · Level A.1", as a person reads a row's name. */
export const keyText = (spec: RateTableSpec, key: Key) =>
  spec.key.map((k) => (key[k.field] === null || key[k.field] === '' ? '—' : String(key[k.field]))).join(' · ')

/** One row of one table, whichever change is staged against it. */
export const stagedId = (table: RateTable, key: Key) =>
  `${table}|${JSON.stringify(tableSpec(table).key.map((k) => key[k.field] ?? null))}`

export const idOf = (change: Staged) => stagedId(change.table, change.key)

/** Replaces whatever was staged against the same row. */
export function upsert(staged: Staged[], change: Staged): Staged[] {
  const id = idOf(change)
  const at = staged.findIndex((existing) => idOf(existing) === id)
  if (at === -1) return [...staged, change]
  return staged.map((existing, i) => (i === at ? change : existing))
}

export const without = (staged: Staged[], id: string) =>
  staged.filter((change) => idOf(change) !== id)

/**
 * The update a row's edited figures make: only the fields that now differ
 * from the saved row, or nothing if every field is back as it was.
 */
export function updateOf(
  spec: RateTableSpec,
  key: Key,
  saved: Values,
  edited: Values,
): Staged | null {
  const differing = spec.values.filter((v) => edited[v.field] !== saved[v.field]).map((v) => v.field)
  if (differing.length === 0) return null
  return {
    op: 'update',
    table: spec.id,
    key,
    was: Object.fromEntries(differing.map((field) => [field, saved[field]])),
    value: Object.fromEntries(differing.map((field) => [field, edited[field]])),
  }
}

export function toRequest(change: Staged): LookupChange {
  switch (change.op) {
    case 'update':
      return { table: change.table, op: 'update', lookup: change.key, values: change.value }
    case 'create':
      return { table: change.table, op: 'create', values: { ...change.key, ...change.value } }
    case 'delete':
      return { table: change.table, op: 'delete', lookup: change.key }
  }
}

/**
 * Which staged change the server refused, read off the error's
 * `changes.<index>` field, and what it said. The index is the change's place
 * in the request, which is its place in `staged`.
 */
export function refusedChange(error: unknown, staged: Staged[]): { id: string; message: string } | null {
  if (!(error instanceof ApiError)) return null
  for (const [attr, message] of Object.entries(error.fields)) {
    const index = /^changes\.(\d+)/.exec(attr)?.[1]
    const change = index === undefined ? undefined : staged[Number(index)]
    if (change) return { id: idOf(change), message }
  }
  return null
}

/** "12 changes across 2 tables". */
export function countText(staged: Staged[]) {
  const tables = new Set(staged.map((change) => change.table)).size
  const changes = `${staged.length} ${staged.length === 1 ? 'change' : 'changes'}`
  return `${changes} across ${tables} ${tables === 1 ? 'table' : 'tables'}`
}
