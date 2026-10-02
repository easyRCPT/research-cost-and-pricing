import type { LookupChange, RateTable } from '@/api/admin-lookups'
import { fieldErrors } from '@/lib/api'

import { KINDS } from './fieldKinds'
import type { Refused } from './rates/types'
import { type KeyField, type RateTableSpec, tableSpec, type ValueField } from './rateTables'

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

/** One key field's value as a person reads it. */
export const keyShown = (k: KeyField, value: unknown) => {
  if (value === null || value === undefined || value === '') return '—'
  return k.format ? k.format(String(value)) : String(value)
}

/** "Fortnight · Academic · Level A.1", as a person reads a row's name. */
export const keyText = (spec: RateTableSpec, key: Key) =>
  spec.key.map((k) => keyShown(k, key[k.field])).join(' · ')

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
 * Which staged change the server refused, read off `changes.<index>[.<field>]`.
 * A message on a value field is kept against it; any other is the row's.
 */
export function refusedChange(error: unknown, staged: Staged[]): Refused {
  const refusals = Object.entries(fieldErrors(error)).flatMap(([attr, text]) => {
    const match = /^changes\.(\d+)(?:\.(.+))?$/.exec(attr)
    const change = match ? staged[Number(match[1])] : undefined
    return match && change ? [{ change, path: match[2], text }] : []
  })
  if (refusals.length === 0) return null

  const { change } = refusals[0]
  const valueFields = new Set(tableSpec(change.table).values.map((v) => v.field))
  const refused: NonNullable<Refused> = { id: idOf(change), message: null, fields: {} }
  for (const { change: other, path, text } of refusals) {
    if (other !== change) continue
    const field = path?.split('.').find((part) => valueFields.has(part))
    if (field) refused.fields[field] ??= text
    else refused.message ??= text
  }
  return refused
}

/** "12 changes across 2 tables". */
export function countText(staged: Staged[]) {
  const tables = new Set(staged.map((change) => change.table)).size
  const changes = `${staged.length} ${staged.length === 1 ? 'change' : 'changes'}`
  return `${changes} across ${tables} ${tables === 1 ? 'table' : 'tables'}`
}
