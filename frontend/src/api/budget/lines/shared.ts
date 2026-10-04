import type { Command } from '@/api/budget/write'
import type { EditableStaffLine, NonStaffLine } from '@/types'

export interface Lines<T> {
  lines: T[]
  years: number[]
  patchLine: (id: string, patch: Partial<T>) => void
  addLine: (initial?: Partial<T>) => void
  removeLine: (id: string) => void
}

export type StaffLines = Lines<EditableStaffLine>
export type NonStaffLines = Lines<NonStaffLine>

export const byPosition = (a: { position: number }, b: { position: number }) =>
  a.position - b.position

/**
 * Names the field a burst of edits is landing on, so the writes coalesce.
 *
 * Only for a patch that moves one field: that is the shape typing produces.
 * A patch that moves several is a choice that cascaded -- picking an
 * employment type that invalidates the time basis -- and is sent at once,
 * since a later edit to a different field must not replace it.
 */
export function coalesceKey(
  section: string,
  id: string,
  patch: object,
): string | undefined {
  const fields = Object.keys(patch)
  return fields.length === 1 ? `${section}:${id}:${fields[0]}` : undefined
}

/**
 * Draft rows with a create already in flight.
 *
 * A draft stays on screen until the server has it, so the next keystroke finds
 * it still there and would post it a second time. One create per draft row.
 */
export const creating = new Set<string>()
export const inFlight = (budgetId: number, draftId: string) =>
  `${budgetId}:${draftId}`

export function createOnce(
  budgetId: number,
  draftId: string,
  create: () => void,
) {
  const key = inFlight(budgetId, draftId)
  if (creating.has(key)) return
  creating.add(key)
  create()
}

/**
 * Blank rows to type into.
 *
 * The grid is filled in by typing across a blank row, so there has to be one
 * waiting. An empty budget opens with a screenful of them, the way the
 * browser-held budget used to; after that a single trailing blank keeps the
 * next row always ready, and the Add button is there for more at once.
 *
 * They are drafts, not saved rows: the model will not store a staff line with
 * no classification, so a row moves to the server once it is complete.
 */
export function blankRows<T>(
  count: number,
  empty: (id: string, years: number[]) => T,
  years: number[],
) {
  return Array.from({ length: count }, () => empty(crypto.randomUUID(), years))
}

type ByYear<K extends string> = ({ year: number } & Record<K, number>)[]

/** One command per field the patch moved on a saved row. */
export function patchCommands<K extends 'time' | 'amount'>(
  section: 'staff' | 'non_staff',
  id: string,
  current: { by_year: ByYear<K> },
  patch: { by_year?: ByYear<K> },
  fields: Set<string>,
  yearKey: K,
) {
  const commands: Command[] = []

  for (const [field, value] of Object.entries(patch)) {
    if (field === 'by_year') {
      for (const entry of patch.by_year ?? []) {
        const before = current.by_year.find((year) => year.year === entry.year)
        if (before?.[yearKey] !== entry[yearKey])
          commands.push({
            section,
            field: 'year_value',
            row_id: id,
            year: entry.year,
            value: entry[yearKey],
          } as Command)
      }
      continue
    }

    if (
      fields.has(field) &&
      value !== (current as Record<string, unknown>)[field]
    )
      commands.push({
        section,
        field,
        row_id: id,
        value,
      } as Command)
  }

  return commands
}
