import type { Deliverable, DeliverableInput, LookupTables } from '@/types'

/**
 * A deliverable the model will store.
 *
 * Description and type are the two the model requires; everything else on the
 * row is optional, and an invoice amount with nothing named is not a
 * deliverable. Until both are there the row stays a draft in the browser.
 */
export const isComplete = (row: Deliverable) =>
  row.description.trim() !== '' && row.deliverable_type !== ''

export const emptyDeliverable = (id: number, number: number): Deliverable => ({
  id,
  number,
  description: '',
  deliverable_type: '',
  invoice_amount: null,
  due_date: '',
  dependency: null,
  sponsor: '',
})

/**
 * The number the next row takes.
 *
 * Counted from the highest in use rather than the row count, so deleting the
 * third of four does not hand the next row a number that is already taken --
 * the model holds them unique per budget.
 */
export const nextNumber = (rows: readonly Deliverable[]) =>
  rows.reduce((highest, row) => Math.max(highest, row.number), 0) + 1

/** Type names, which is what the column shows and what a row holds. */
export const typeNames = (lookups: LookupTables) =>
  lookups.deliverable_types.map((type) => type.name)

/**
 * The code behind a type name.
 *
 * The grid works in names because that is what a reader picks from; the API
 * takes the code. Same shape as the ledger id the non-staff grid resolves.
 */
export const typeCode = (lookups: LookupTables, name: string) =>
  lookups.deliverable_types.find((type) => type.name === name)?.code

export const toDeliverableInput = (
  row: Deliverable,
  deliverable_type: string,
): DeliverableInput => ({
  number: row.number,
  description: row.description,
  deliverable_type,
  invoice_amount: row.invoice_amount,
  due_date: row.due_date,
  dependency: row.dependency,
  sponsor: row.sponsor,
})
