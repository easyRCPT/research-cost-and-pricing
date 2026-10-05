import type { ReactNode } from 'react'

import { columnHelper, type DataTableFilter } from '@/components/data-table'
import { displayName, money, money2 } from '@/lib/format/utils'
import { salaryRateYear } from '@/lib/salary-rate-year'
import type { LookupTables } from '@/types'

import { byCode, codeNameColumns } from './code-name-columns'
import { type LookupTable, lookupTable } from './lookup-table'
import { ON_COST_TABLES } from './on-cost-tables'

type Constant = LookupTables['calculation_constants'][number]
type Increase = LookupTables['eba_increases'][number]
type SalaryRate = LookupTables['salary_rates'][number]
type IncrementCap = LookupTables['increment_caps'][number]
type Multiplier = LookupTables['salary_rate_multipliers'][number]
type Department = LookupTables['departments'][number]
type Category = LookupTables['non_staff_cost_categories'][number]
type RevenueCategory = LookupTables['revenue_categories'][number]
type Currency = LookupTables['currencies'][number]

const percentage = (value: number) => `${(value * 100).toFixed(2)}%`

const CONSTANT_FORMAT: Record<string, (value: number) => string> = {
  gst_rate: percentage,
  max_leave_loading: money,
}

const constant = columnHelper<Constant>()
const CONSTANT_COLUMNS = constant.columns([
  // Read-only here, as everywhere: the engine reads each constant by name.
  constant.accessor('name', {
    header: 'Constant',
    cell: ({ getValue }) => displayName(getValue()),
  }),
  constant.accessor('description', { header: 'Description' }),
  constant.accessor('value', {
    header: 'Value',
    cell: ({ row, getValue }) =>
      (CONSTANT_FORMAT[row.original.name] ?? String)(getValue()),
    meta: { align: 'right', className: 'w-[180px] tabular' },
  }),
])

const rate = columnHelper<SalaryRate>()
const RATE_COLUMNS = rate.columns([
  rate.accessor('payroll_type', { header: 'Payroll type' }),
  rate.accessor('category', { header: 'Category' }),
  rate.accessor('classification', { header: 'Classification' }),
  rate.accessor('rate', {
    header: 'Rate',
    cell: ({ getValue }) => `$${money2(getValue())}`,
    meta: { align: 'right', className: 'tabular' },
  }),
])

/** "Level A.3" and "UOM 4.2" filter by their family, "Level A" and "UOM 4". */
const classificationFamily = (row: SalaryRate) =>
  row.classification.split('.')[0]

const RATE_FILTERS: DataTableFilter<SalaryRate>[] = [
  { id: 'payroll', label: 'Payroll type', value: (row) => row.payroll_type },
  { id: 'category', label: 'Category', value: (row) => row.category },
  { id: 'family', label: 'Classification', value: classificationFamily },
]

const cap = columnHelper<IncrementCap>()
const CAP_COLUMNS = cap.columns([
  cap.accessor('category', { header: 'Category family' }),
  cap.accessor('level', { header: 'Classification family' }),
  cap.accessor('max_steps', {
    header: 'Max. step',
    meta: { align: 'right', className: 'tabular' },
  }),
])

const multiplier = columnHelper<Multiplier>()
const MULTIPLIER_COLUMNS = multiplier.columns([
  multiplier.accessor('time_basis', { header: 'Time basis' }),
  multiplier.accessor('multiplier', {
    header: 'Multiplier',
    cell: ({ getValue }) => getValue().toFixed(6),
    meta: { align: 'right', className: 'tabular' },
  }),
])

const eba = columnHelper<Increase>()
const EBA_COLUMNS = eba.columns([
  eba.accessor('year', { header: 'Year', meta: { className: 'tabular' } }),
  eba.accessor('rate', {
    header: 'Rate',
    cell: ({ getValue }) => getValue().toFixed(4),
    meta: { align: 'right', className: 'tabular' },
  }),
])

// The workbook's dCurrencyRates (Lookup Tables U35:Y56), as it lays it out.
const currency = columnHelper<Currency>()
const CURRENCY_COLUMNS = currency.columns([
  currency.accessor((row) => `${row.code} - ${row.name}`, {
    id: 'display',
    header: 'Currency',
  }),
  currency.accessor('code', {
    header: 'Code',
    meta: { className: 'text-muted-foreground' },
  }),
  currency.accessor('rate', {
    header: '1 AUD =',
    cell: ({ getValue }) => getValue().toFixed(6),
    meta: { align: 'right', className: 'tabular' },
  }),
  currency.accessor('inverse', {
    header: 'Inv. 1 AUD',
    cell: ({ getValue }) => getValue().toFixed(6),
    meta: { align: 'right', className: 'tabular' },
  }),
])

const department = columnHelper<Department>()
const DEPARTMENT_COLUMNS = department.columns([
  department.accessor('code', {
    header: 'Dept code',
    meta: { className: 'text-muted-foreground' },
  }),
  department.accessor('name', { header: 'Department' }),
  department.accessor('school', { header: 'School' }),
  department.accessor('faculty', { header: 'Faculty' }),
])

const DEPARTMENT_FILTERS: DataTableFilter<Department>[] = [
  { id: 'school', label: 'School', value: (row) => row.school },
  { id: 'faculty', label: 'Faculty', value: (row) => row.faculty },
]

const category = columnHelper<Category>()
const CATEGORY_COLUMNS = category.columns([
  category.accessor('cost_category', { header: 'Cost group' }),
  category.accessor('cost_subcategory', { header: 'Expense type' }),
  category.accessor('ledger_id', {
    header: 'Ledger ID',
    meta: { align: 'right', className: 'tabular' },
  }),
])

const CATEGORY_FILTERS: DataTableFilter<Category>[] = [
  { id: 'group', label: 'Cost group', value: (row) => row.cost_category },
]

const revenue = columnHelper<RevenueCategory>()
const REVENUE_COLUMNS = revenue.columns([
  revenue.accessor('external_party', { header: 'External party' }),
  revenue.accessor('description', { header: 'Description' }),
  revenue.accessor('budget_ledger_id', {
    header: 'Ledger ID',
    meta: { align: 'right', className: 'tabular' },
  }),
])

const REVENUE_FILTERS: DataTableFilter<RevenueCategory>[] = [
  { id: 'party', label: 'External party', value: (row) => row.external_party },
]

export interface LookupTab {
  value: string
  title: string
  notice?: (lookups: LookupTables) => ReactNode
  tables: readonly LookupTable[]
}

/** The tabs of both lookup screens: the costing one reads them, the admin one edits them. */
export const LOOKUP_TABS = [
  {
    value: 'constants',
    title: 'Constants',
    tables: [
      lookupTable({
        value: 'constants',
        title: 'All constants',
        columns: CONSTANT_COLUMNS,
        rows: (lookups) => lookups.calculation_constants,
        getRowId: (row) => row.name,
      }),
    ],
  },
  {
    value: 'rates',
    title: 'Salary Rates',
    notice: (lookups) => {
      const year = salaryRateYear(lookups)
      return (
        <>
          Fortnightly rates are displayed <b>annual</b>; casual rates are
          displayed <b>hourly</b>.
          {year !== undefined && (
            <>
              {' '}
              These are <b>{year}</b> rates: each later year adds that
              year&rsquo;s EBA increase.
            </>
          )}
        </>
      )
    },
    tables: [
      lookupTable({
        value: 'rates',
        title: 'Salary Rates',
        columns: RATE_COLUMNS,
        rows: (lookups) => lookups.salary_rates,
        getRowId: (row) =>
          `${row.payroll_type}-${row.category}-${row.classification}`,
        sortable: true,
        searchable: true,
        filters: RATE_FILTERS,
      }),
      lookupTable({
        value: 'caps',
        title: 'Salary increment caps',
        columns: CAP_COLUMNS,
        rows: (lookups) => lookups.increment_caps,
        getRowId: (row) => row.level,
      }),
      lookupTable({
        value: 'multipliers',
        title: 'Time basis multipliers',
        columns: MULTIPLIER_COLUMNS,
        rows: (lookups) => lookups.salary_rate_multipliers,
        getRowId: (row) => row.time_basis,
      }),
    ],
  },
  {
    value: 'eba',
    title: 'EBA Increases',
    notice: () =>
      'Only years in which the EBA rate changes are displayed. Years with no change in the rate are omitted. EBA increases before the first recorded year are treated as 0.',
    tables: [
      lookupTable({
        value: 'increases',
        title: 'EBA increases by year',
        columns: EBA_COLUMNS,
        rows: (lookups) => lookups.eba_increases,
        getRowId: (row) => String(row.year),
      }),
    ],
  },
  { value: 'oncosts', title: 'On-costs', tables: ON_COST_TABLES },
  {
    value: 'currencies',
    title: 'Currencies',
    notice: () =>
      'What 1 AUD buys of each currency a costing can be priced in. A costing in another currency converts staff costs from AUD at this rate, unless a rate of its own is set for it.',
    tables: [
      lookupTable({
        value: 'currencies',
        title: 'Currency rates',
        columns: CURRENCY_COLUMNS,
        rows: (lookups) => lookups.currencies,
        getRowId: (row) => row.code,
        sortable: true,
        searchable: true,
      }),
    ],
  },
  {
    value: 'orgunits',
    title: 'Org Units',
    tables: [
      lookupTable({
        value: 'orgunits',
        title: 'Org Units',
        columns: DEPARTMENT_COLUMNS,
        rows: (lookups) => lookups.departments,
        getRowId: (row) => row.code,
        sortable: true,
        searchable: true,
        filters: DEPARTMENT_FILTERS,
      }),
    ],
  },
  {
    value: 'expenses',
    title: 'Non-Staff Expenses',
    tables: [
      lookupTable({
        value: 'expenses',
        title: 'Non-Staff Expense Types',
        columns: CATEGORY_COLUMNS,
        rows: (lookups) => lookups.non_staff_cost_categories,
        getRowId: (row) => String(row.ledger_id),
        sortable: true,
        searchable: true,
        filters: CATEGORY_FILTERS,
      }),
    ],
  },
  {
    value: 'attributes',
    title: 'Activities & Regions',
    tables: [
      lookupTable({
        value: 'activities',
        title: 'Activities',
        columns: codeNameColumns('Activity'),
        rows: (lookups) => lookups.activities,
        getRowId: byCode,
      }),
      lookupTable({
        value: 'regions',
        title: 'Regions',
        columns: codeNameColumns('Region'),
        rows: (lookups) => lookups.regions,
        getRowId: byCode,
      }),
    ],
  },
  {
    value: 'deliverables',
    title: 'Deliverables & Revenue',
    tables: [
      lookupTable({
        value: 'deliverables',
        title: 'Deliverable types',
        columns: codeNameColumns('Deliverable'),
        rows: (lookups) => lookups.deliverable_types,
        getRowId: byCode,
      }),
      lookupTable({
        value: 'revenue',
        title: 'Revenue categories',
        columns: REVENUE_COLUMNS,
        rows: (lookups) => lookups.revenue_categories,
        getRowId: (row) => String(row.budget_ledger_id),
        sortable: true,
        searchable: true,
        filters: REVENUE_FILTERS,
      }),
    ],
  },
] as const satisfies readonly LookupTab[]

export type LookupTabValue = (typeof LOOKUP_TABS)[number]['value']
