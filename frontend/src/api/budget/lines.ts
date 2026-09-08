import { type BudgetInput, useBudgetInput } from '@/lib/budget-store'
import type { NonStaffLine, StaffLine } from '@/types'
import { emptyNonStaffLine } from '@/lib/non-staff'
import { emptyStaffLine } from '@/lib/staff'
import { nextTempId } from '@/lib/utils'
import { useCommit } from './commit'

/** One editable list of rows in the store. */
interface LineList<T extends { id: number }> {
  read: (input: BudgetInput) => T[]
  write: (input: BudgetInput, lines: T[]) => BudgetInput
  empty: (id: number, years: number[]) => T
}

const STAFF_LINES: LineList<StaffLine> = {
  read: (input) => input.staff_lines,
  write: (input, staff_lines) => ({ ...input, staff_lines }),
  empty: emptyStaffLine,
}

const NON_STAFF_LINES: LineList<NonStaffLine> = {
  read: (input) => input.non_staff_lines,
  write: (input, non_staff_lines) => ({ ...input, non_staff_lines }),
  empty: emptyNonStaffLine,
}

export interface Lines<T> {
  lines: T[]
  years: number[]
  patchLine: (id: number, patch: Partial<T>) => void
  addLine: () => void
  removeLine: (id: number) => void
}

export type StaffLines = Lines<StaffLine>
export type NonStaffLines = Lines<NonStaffLine>

function useLines<T extends { id: number }>(
  list: LineList<T>,
  years: number[],
): Lines<T> {
  const lines = list.read(useBudgetInput())
  const commit = useCommit()

  const rewrite = (next: (rows: T[]) => T[]) =>
    commit((budget) => list.write(budget, next(list.read(budget))))

  return {
    lines,
    years,
    patchLine: (id, patch) =>
      rewrite((rows) =>
        rows.map((line) => (line.id === id ? { ...line, ...patch } : line)),
      ),
    addLine: () =>
      rewrite((rows) => [...rows, list.empty(nextTempId(rows), years)]),
    removeLine: (id) =>
      rewrite((rows) => rows.filter((line) => line.id !== id)),
  }
}

export const useStaffLines = (years: number[]) => useLines(STAFF_LINES, years)

export const useNonStaffLines = (years: number[]) =>
  useLines(NON_STAFF_LINES, years)
