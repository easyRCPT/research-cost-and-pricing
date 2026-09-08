import type {
  BudgetDetail,
  CalculateStaffLine,
  EmploymentType,
  SalaryRate,
  SalaryRateMultiplier,
  StaffCategory,
  StaffLine,
  TimeBasis,
} from '@/types'

export const EMPLOYMENT_TYPES: readonly EmploymentType[] = [
  'Continuing',
  'Fixed-Term',
  'Casual',
]

export const staffCategories = (rates: readonly SalaryRate[]) => [
  ...new Set(rates.map((rate) => rate.category)),
]

export const classificationsFor = (
  rates: readonly SalaryRate[],
  category: string,
) => [
  ...new Set(
    rates
      .filter((rate) => rate.category === category)
      .map((rate) => rate.classification),
  ),
]

export const timeBasesFor = (
  multipliers: readonly SalaryRateMultiplier[],
  employmentType: string,
) => {
  const bases = multipliers.map((multiplier) => multiplier.time_basis)
  if (!employmentType) return []
  return employmentType === 'Casual'
    ? bases.filter((basis) => basis === 'Hourly')
    : bases.filter((basis) => basis !== 'Hourly')
}

/**
 * An FTE row is a fraction of one full-time position. Daily and hourly rows count
 * days and hours, which the workbook leaves open-ended; a full year is as much as
 * either can mean. Kept in step with the backend's TIME_LIMITS.
 */
const TIME_LIMITS: Record<string, { label: string; max: number }> = {
  FTE: { label: 'FTE', max: 1 },
  Daily: { label: 'Days', max: 366 },
  Hourly: { label: 'Hours', max: 366 * 24 },
}

export const maxTimeFor = (timeBasis: string) => TIME_LIMITS[timeBasis]?.max

/** Names the time column in messages, before a basis is picked too. */
export const timeLabelFor = (timeBasis: string) =>
  TIME_LIMITS[timeBasis]?.label ?? 'Time'

/** Re-clamps the entered time after a change of basis. */
export const clampedByYear = (line: StaffLine, timeBasis: string) => {
  const max = maxTimeFor(timeBasis)
  if (max === undefined) return line.by_year
  return line.by_year.map((entry) => ({
    ...entry,
    time: Math.min(max, entry.time),
  }))
}

export const timeFor = (line: StaffLine, year: number) =>
  line.by_year.find((entry) => entry.year === year)?.time ?? 0

export const costFor = (line: StaffLine, year: number) =>
  line.by_year.find((entry) => entry.year === year)?.cost ?? 0

export const withTime = (
  line: StaffLine,
  years: number[],
  year: number,
  time: number,
) =>
  years.map((y) => ({
    year: y,
    time: y === year ? time : timeFor(line, y),
    cost: costFor(line, y),
  }))

export const emptyStaffLine = (id: number, years: number[]): StaffLine => ({
  id,
  name_role: '',
  employment_type: '',
  category: '',
  classification: '',
  time_basis: '',
  in_kind: false,
  rate_2025: 0,
  by_year: years.map((year) => ({ year, time: 0, cost: 0 })),
  total: 0,
})

/** Rows the engine can rate. The name is echoed back, never priced. */
export const isRated = (line: StaffLine) =>
  line.employment_type !== '' &&
  line.category !== '' &&
  line.classification !== '' &&
  line.time_basis !== ''

export const toInput = (line: StaffLine): CalculateStaffLine => ({
  id: line.id,
  name_role: line.name_role,
  employment_type: line.employment_type as EmploymentType,
  category: line.category as StaffCategory,
  classification: line.classification,
  time_basis: line.time_basis as TimeBasis,
  in_kind: line.in_kind,
  by_year: line.by_year.map(({ year, time }) => ({ year, time })),
})

/** Entry columns from the store; rate and cost columns from whichever block priced the row. */
export const withCosts = (lines: StaffLine[], budget: BudgetDetail) => {
  const priced = new Map(
    [...budget.staff_cost.lines, ...budget.staff_in_kind_cost.lines].map(
      (line) => [line.id, line],
    ),
  )

  return lines.map((line) => {
    const cost = priced.get(line.id)
    if (!cost) return line
    return {
      ...line,
      rate_2025: cost.rate_2025,
      total: cost.total,
      by_year: line.by_year.map((entry) => ({
        ...entry,
        cost: costFor(cost, entry.year),
      })),
    }
  })
}
