import type { LookupChange, RateTable } from '@/api/admin-lookups'
import { ApiError } from '@/lib/api'
import { tableSpec, type RateTableSpec } from './rateTables'

export type Row = Record<string, unknown>
export type Key = Record<string, unknown>

/**
 * An edit held on screen until the set is saved (#138). Screen state only:
 * what was typed and what it said before, so the review can show old → new.
 * Whether a change is allowed is the server's to say when the set is saved.
 */
export type Staged =
  | { op: 'update'; table: RateTable; key: Key; was: number; value: number }
  | { op: 'create'; table: RateTable; key: Key; value: number }
  | { op: 'delete'; table: RateTable; key: Key; was: number }

export const keyOf = (spec: RateTableSpec, row: Row): Key =>
  Object.fromEntries(spec.key.map((k) => [k.field, row[k.field] ?? null]))

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

export function toRequest(change: Staged): LookupChange {
  const spec = tableSpec(change.table)
  switch (change.op) {
    case 'update':
      return { table: change.table, op: 'update', lookup: change.key, values: { [spec.value.field]: change.value } }
    case 'create':
      return { table: change.table, op: 'create', values: { ...change.key, [spec.value.field]: change.value } }
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
