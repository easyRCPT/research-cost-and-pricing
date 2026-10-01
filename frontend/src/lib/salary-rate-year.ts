import type { LookupTables } from '@/types'

/**
 * The year the salary table's rates are for (the `salary_rate_year` constant,
 * #148). Shown beside the rates so nobody reads a 2025 figure as this year's.
 */
export const salaryRateYear = (lookups: LookupTables): number | undefined => {
  const constant = lookups.calculation_constants.find((row) => row.name === 'salary_rate_year')
  return constant === undefined ? undefined : Number(constant.value)
}
