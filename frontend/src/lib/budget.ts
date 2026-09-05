import type { BudgetDetail, NonStaffLine, StaffLine } from '@/types'

/** Helper for sorting by id */
const byId = <T extends { id: number }>(a: T, b: T) => a.id - b.id

/** Staff lines (in kind included) sorted by Id */
export const staffLines = (b: BudgetDetail): StaffLine[] =>
  [...b.staff_cost.lines, ...b.staff_in_kind_cost.lines].sort(byId)

/** Non staff lines (in kind included) sorted by Id  */
export const nonStaffLine = (b: BudgetDetail): NonStaffLine[] =>
  [...b.non_staff_cost.lines, ...b.non_staff_in_kind_cost.lines].sort(byId)

/** index the years object */
export const yearIndex = (b: BudgetDetail, year: number) =>
  b.years.indexOf(year)
