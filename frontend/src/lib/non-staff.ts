import type { NonStaffCategory, NonStaffLine } from '@/types'

export const costGroups = (categories: readonly NonStaffCategory[]) => [
  ...new Set(categories.map((c) => c.cost_category)),
]

export const expenseTypesFor = (
  categories: readonly NonStaffCategory[],
  costGroup: string,
) =>
  categories
    .filter((c) => c.cost_category === costGroup)
    .map((c) => c.cost_subcategory)

/** Every expense type in the table, for sizing before a cost group is picked. */
export const allExpenseTypes = (categories: readonly NonStaffCategory[]) => [
  ...new Set(categories.map((c) => c.cost_subcategory)),
]

// TODO: Convert into a flag in lookup table
const NO_TEN_PERCENT = new Set(['Student Support', 'Shared Grant Payments'])

export const tenPercentAllowed = (costGroup: string) =>
  costGroup !== '' && !NO_TEN_PERCENT.has(costGroup)

/** Returns the cost amount for a given year in a NonStaffLine  */
export const amountFor = (line: NonStaffLine, year: number) =>
  line.by_year.find((y) => y.year === year)?.amount ?? 0

export const withAmount = (
  line: NonStaffLine,
  years: number[],
  year: number,
  amount: number,
) =>
  years.map((y) => ({
    year: y,
    amount: y === year ? amount : amountFor(line, y),
  }))

export const lineTotal = (line: NonStaffLine, years: number[]) =>
  years.reduce((sum, year) => sum + amountFor(line, year), 0)

export const emptyNonStaffLine = (
  id: number,
  years: number[],
): NonStaffLine => ({
  id,
  cost_group: '',
  expense_type: '',
  description: '',
  in_kind: false,
  add_ten_percent: false,
  indirect_rate_multiplier: null,
  by_year: years.map((year) => ({ year, amount: 0 })),
  total: 0,
  direct_total: 0,
})
