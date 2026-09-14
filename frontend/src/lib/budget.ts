import type { BudgetDetail, ProjectInfo } from '@/types'

/** index the years object */
export const yearIndex = (b: BudgetDetail, year: number) =>
  b.years.indexOf(year)

/** Every calendar year from project's start to end (inclusive) */
export const projectYears = (p: ProjectInfo): number[] =>
  Array.from(
    { length: p.end_year - p.start_year + 1 },
    (_, i) => p.start_year + i,
  )
