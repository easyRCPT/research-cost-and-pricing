import { useMemo } from 'react'
import { DataTable, TableCard, columnHelper } from '@/components/data-table'
import type { LookupTables } from '@/types'

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

const byComponent = (row: ComponentRow) => row.component
const byDatedRate = (row: OnCostRate) =>
  `${row.on_cost_type}-${row.employment_type}-${row.year}`

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

interface OnCostsTabProps {
  rates: LookupTables['on_cost_rates']
}

export function OnCostsTab({ rates }: OnCostsTabProps) {
  const components = useMemo(() => toComponentRows(rates), [rates])
  const datedRates = useMemo(
    () => rates.filter((rate) => rate.year != null),
    [rates],
  )

  return (
    <TableCard
      tables={[
        {
          value: 'components',
          title: 'On-cost components',
          table: (
            <DataTable
              columns={COMPONENT_COLUMNS}
              rows={components}
              getRowId={byComponent}
            />
          ),
        },
        {
          value: 'dated',
          title: 'Dated rates',
          table: (
            <DataTable
              columns={DATED_COLUMNS}
              rows={datedRates}
              getRowId={byDatedRate}
            />
          ),
        },
      ]}
    />
  )
}
