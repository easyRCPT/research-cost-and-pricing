import type { RateTable } from '@/api/admin-lookups'
import { constantName } from '@/lib/format/constants'

export interface KeyField {
  field: string
  label: string
  kind: 'text' | 'number'
}

export interface ValueField {
  field: string
  label: string
  /**
   * `constant` is a constant's value: a decimal, or for a rate a percentage
   * such as `30%`, saved as its decimal (#151).
   */
  kind: 'number' | 'text' | 'boolean' | 'constant'
  /** For a number: the step the field moves by. */
  step?: number
}

export interface RateTableSpec {
  id: RateTable
  label: string
  /** The fields that name a row. Never edited: a different key is a new row. */
  key: KeyField[]
  /** The figures an administrator changes. Most tables have one. */
  values: ValueField[]
  /**
   * Whether rows can be added and removed. The server refuses both for the
   * tables the costing engine reads row by row; these only keep the screen
   * from offering what would be refused.
   */
  addable?: boolean
  removable?: boolean
  /** What a row is, for a person, when its key is a code name (#151). */
  about?: (row: Record<string, unknown>) => { name: string; detail?: string }
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
    values: [{ field: 'rate', label: 'Rate', kind: 'number', step: 0.01 }],
  },
  {
    id: 'on_cost_rates',
    label: 'On-costs',
    key: [
      { field: 'on_cost_type', label: 'On-cost', kind: 'text' },
      { field: 'employment_type', label: 'Employment', kind: 'text' },
      { field: 'year', label: 'Year', kind: 'number' },
    ],
    values: [{ field: 'rate', label: 'Rate', kind: 'number', step: 0.0001 }],
  },
  {
    id: 'eba_increases',
    label: 'EBA increases',
    key: [{ field: 'year', label: 'Year', kind: 'number' }],
    values: [{ field: 'rate', label: 'Increase', kind: 'number', step: 0.0001 }],
  },
  {
    id: 'salary_rate_multipliers',
    label: 'Time basis multipliers',
    key: [{ field: 'time_basis', label: 'Time basis', kind: 'text' }],
    values: [{ field: 'multiplier', label: 'Multiplier', kind: 'number', step: 0.0001 }],
    // Every staff line is priced on one of these.
    removable: false,
  },
  {
    // Versioned with the rates (#144): the flag decides whether a line takes
    // the 10% and the indirect rate, so it prices a costing.
    id: 'non_staff_cost_categories',
    label: 'Non-staff categories',
    key: [{ field: 'ledger_id', label: 'Ledger ID', kind: 'number' }],
    values: [
      { field: 'cost_category', label: 'Cost group', kind: 'text' },
      { field: 'cost_subcategory', label: 'Expense type', kind: 'text' },
      { field: 'excludes_additional_rate', label: 'No 10% or indirect rate', kind: 'boolean' },
    ],
  },
  {
    id: 'calculation_constants',
    label: 'Constants',
    key: [{ field: 'name', label: 'Name', kind: 'text' }],
    values: [{ field: 'value', label: 'Value', kind: 'constant' }],
    // The engine reads each constant by name, so a new one would never be
    // used and a removed one would break every costing.
    addable: false,
    removable: false,
    about: (row) => ({
      name: constantName(String(row.name)),
      detail: row.description ? String(row.description) : undefined,
    }),
  },
]

export const tableSpec = (id: RateTable) =>
  RATE_TABLES.find((table) => table.id === id) ?? RATE_TABLES[0]

export const isRateTable = (id: string): id is RateTable =>
  RATE_TABLES.some((table) => table.id === id)
