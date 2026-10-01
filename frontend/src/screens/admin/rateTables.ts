import type { RateTable } from '@/api/admin-lookups'

export interface RateTableSpec {
  id: RateTable
  label: string
  /** The fields that name a row. Never edited: a different key is a new row. */
  key: { field: string; label: string; kind: 'text' | 'number' }[]
  /** The one figure an administrator changes. */
  value: { field: string; label: string; step: number }
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
    value: { field: 'multiplier', label: 'Multiplier', step: 0.0001 },
  },
  {
    id: 'salary_rate_multipliers',
    label: 'Time basis multipliers',
    key: [{ field: 'time_basis', label: 'Time basis', kind: 'text' }],
    value: { field: 'multiplier', label: 'Multiplier', step: 0.0001 },
  },
  {
    id: 'calculation_constants',
    label: 'Constants',
    key: [{ field: 'name', label: 'Name', kind: 'text' }],
    value: { field: 'value', label: 'Value', step: 0.0001 },
  },
]
