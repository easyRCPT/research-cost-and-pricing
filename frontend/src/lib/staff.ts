import type {
  EmploymentType,
  SalaryRate,
  SalaryRateMultiplier,
  StaffCategory,
  StaffLine,
  StaffLineInput,
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

export const isComplete = (line: StaffLine) =>
  line.name_role.trim() !== '' &&
  line.employment_type !== '' &&
  line.category !== '' &&
  line.classification !== '' &&
  line.time_basis !== ''

export const toInput = (line: StaffLine): StaffLineInput => ({
  name_role: line.name_role,
  employment_type: line.employment_type as EmploymentType,
  category: line.category as StaffCategory,
  classification: line.classification,
  time_basis: line.time_basis as TimeBasis,
  in_kind: line.in_kind,
  allocations: line.by_year.map(({ year, time }) => ({ year, time })),
})
