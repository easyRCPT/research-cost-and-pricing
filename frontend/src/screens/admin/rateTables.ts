import type { RateTable } from '@/api/admin-lookups'

export interface RateTableSpec {
  id: RateTable
  label: string
  /** The fields that name a row. Never edited: a different key is a new row. */
  key: { field: string; label: string; kind: 'text' | 'number' }[]
  /** The one figure an administrator changes. */
  value: { field: string; label: string; step: number }
  /**
   * Whether rows can be added and removed. The server refuses both for the
   * tables the costing engine reads row by row; these only keep the screen
   * from offering what would be refused.
   */
  addable?: boolean
  removable?: boolean
}

export const RATE_TABLES: RateTableSpec[] = [
  {
    id: 'salary_rates',
    label: 'Salary rates',
    key: [
      { field: 'payroll_type', label: 'Payroll', kind: 'text' },
      { field: 'category', label: 'Category', kind: 'text' },
      { field: 'classification', label: 'Classification', kind: 'text' },
    ],
    value: { field: 'rate', label: 'Rate', step: 0.01 },
  },
  {
    id: 'on_cost_rates',
    label: 'On-costs',
    key: [
      { field: 'on_cost_type', label: 'On-cost', kind: 'text' },
      { field: 'employment_type', label: 'Employment', kind: 'text' },
      { field: 'year', label: 'Year', kind: 'number' },
    ],
    value: { field: 'rate', label: 'Rate', step: 0.0001 },
  },
  {
    id: 'eba_increases',
    label: 'EBA increases',
    key: [{ field: 'year', label: 'Year', kind: 'number' }],
    value: { field: 'rate', label: 'Increase', step: 0.0001 },
  },
  {
    id: 'salary_rate_multipliers',
    label: 'Time basis multipliers',
    key: [{ field: 'time_basis', label: 'Time basis', kind: 'text' }],
    value: { field: 'multiplier', label: 'Multiplier', step: 0.0001 },
    // Every staff line is priced on one of these.
    removable: false,
  },
  {
    id: 'calculation_constants',
    label: 'Constants',
    key: [{ field: 'name', label: 'Name', kind: 'text' }],
    value: { field: 'value', label: 'Value', step: 0.0001 },
    // The engine reads each constant by name, so a new one would never be
    // used and a removed one would break every costing.
    addable: false,
    removable: false,
  },
]

export const tableSpec = (id: RateTable) =>
  RATE_TABLES.find((table) => table.id === id) ?? RATE_TABLES[0]
