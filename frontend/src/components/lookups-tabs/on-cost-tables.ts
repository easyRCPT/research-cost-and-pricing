import { columnHelper, type DataTableFilter } from '@/components/data-table'
import type { LookupTables } from '@/types'

import { lookupTable } from './lookup-table'

type OnCostRate = LookupTables['on_cost_rates'][number]
type OnCostType = OnCostRate['on_cost_type']

const EMPLOYMENT_COLUMNS = ['Continuing', 'Fixed-Term', 'Casual'] as const
type Employment = (typeof EMPLOYMENT_COLUMNS)[number]

const ON_COST_LABELS: Record<OnCostType, string> = {
  superannuation: 'Superannuation',
  workcover: 'WorkCover',
  leave_loading: 'Leave loading',
  long_service_leave: 'Long service leave',
  parental_leave: 'Parental leave',
  annual_leave_provision: 'Annual leave provision',
}

const percentage = (value: number | undefined) =>
  value === undefined ? '—' : `${(value * 100).toFixed(2)}%`

/** One standing on-cost component with its rate per employment type. */
interface ComponentRow {
  component: OnCostType
  rates: Partial<Record<Employment, number>>
}

const component = columnHelper<ComponentRow>()
const COMPONENT_COLUMNS = component.columns([
  component.accessor('component', {
    header: 'Component',
    cell: ({ getValue }) => ON_COST_LABELS[getValue()],
  }),
  ...EMPLOYMENT_COLUMNS.map((employment) =>
    component.accessor((row) => row.rates[employment], {
      id: employment,
      header: employment,
      cell: ({ getValue }) => percentage(getValue()),
      meta: { align: 'right', className: 'tabular' },
    }),
  ),
])

const dated = columnHelper<OnCostRate>()
const DATED_COLUMNS = dated.columns([
  dated.accessor('year', { header: 'Year', meta: { className: 'tabular' } }),
  dated.accessor('on_cost_type', {
    header: 'Component',
    cell: ({ getValue }) => ON_COST_LABELS[getValue()],
  }),
  dated.accessor('employment_type', {
    header: 'Employment',
    cell: ({ getValue }) => getValue() || 'All',
  }),
  dated.accessor('rate', {
    header: 'Rate',
    cell: ({ getValue }) => percentage(getValue()),
    meta: { align: 'right', className: 'tabular' },
  }),
])

const DATED_FILTERS: DataTableFilter<OnCostRate>[] = [
  { id: 'year', label: 'Year', value: (row) => String(row.year) },
  {
    id: 'component',
    label: 'Component',
    value: (row) => ON_COST_LABELS[row.on_cost_type],
  },
  {
    id: 'employment',
    label: 'Employment',
    value: (row) => row.employment_type || 'All',
  },
]

function toComponentRows(rates: OnCostRate[]): ComponentRow[] {
  const standing = rates.filter((rate) => rate.year == null)
  return (Object.keys(ON_COST_LABELS) as OnCostType[]).map((component) => {
    const row: ComponentRow = { component, rates: {} }
    for (const employment of EMPLOYMENT_COLUMNS) {
      row.rates[employment] = standing.find(
        (rate) =>
          rate.on_cost_type === component &&
          (!rate.employment_type || rate.employment_type === employment),
      )?.rate
    }
    return row
  })
}

export const ON_COST_TABLES = [
  lookupTable({
    value: 'components',
    title: 'On-cost components',
    columns: COMPONENT_COLUMNS,
    rows: (lookups) => toComponentRows(lookups.on_cost_rates),
    getRowId: (row) => row.component,
  }),
  lookupTable({
    value: 'dated',
    title: 'Dated rates',
    columns: DATED_COLUMNS,
    rows: (lookups) =>
      lookups.on_cost_rates.filter((rate) => rate.year != null),
    getRowId: (row) => `${row.on_cost_type}-${row.employment_type}-${row.year}`,
    sortable: true,
    searchable: true,
    filters: DATED_FILTERS,
  }),
]
