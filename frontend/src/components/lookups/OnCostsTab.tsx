import { Grid, Note, Panel, Td, Th } from '@/components/shell'
import type { LookupTables } from '@/types'

type OnCostRate = LookupTables['on_cost_rates'][number]
type OnCostType = OnCostRate['on_cost_type']

const EMPLOYMENT_COLUMNS = ['Continuing', 'Fixed-Term', 'Casual'] as const

const ON_COST_LABELS: Record<OnCostType, string> = {
  superannuation: 'Superannuation',
  payroll_tax: 'Payroll tax',
  workcover: 'WorkCover',
  leave_loading: 'Leave loading',
  long_service_leave: 'Long service leave',
  parental_leave: 'Parental leave',
  annual_leave_provision: 'Annual leave provision',
}

const percentage = (value: number | undefined) =>
  value === undefined ? '—' : `${(value * 100).toFixed(2)}%`

interface OnCostsTabProps {
  rates: LookupTables['on_cost_rates']
}

export function OnCostsTab({ rates }: OnCostsTabProps) {
  const standing = rates.filter((rate) => rate.year == null)
  const dated = rates.filter((rate) => rate.year != null)

  const getRate = (component: OnCostType, employment: string) =>
    standing.find(
      (rate) =>
        rate.on_cost_type === component &&
        (!rate.employment_type || rate.employment_type === employment),
    )?.rate

  return (
    <div className="space-y-4">
      <Panel title="On-cost components">
        <Grid>
          <thead>
            <tr>
              <Th>Component</Th>
              {EMPLOYMENT_COLUMNS.map((employment) => (
                <Th key={employment} align="right">
                  {employment}
                </Th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(Object.keys(ON_COST_LABELS) as OnCostType[]).map((component) => (
              <tr key={component}>
                <Td>{ON_COST_LABELS[component]}</Td>
                {EMPLOYMENT_COLUMNS.map((employment) => (
                  <Td key={employment} align="right" className="tabular">
                    {percentage(getRate(component, employment))}
                  </Td>
                ))}
              </tr>
            ))}
          </tbody>
        </Grid>
      </Panel>

      <Panel title="Dated rates">
        <Grid>
          <thead>
            <tr>
              <Th>Year</Th>
              <Th>Component</Th>
              <Th>Employment</Th>
              <Th align="right">Rate</Th>
            </tr>
          </thead>
          <tbody>
            {dated.map((rate) => (
              <tr
                key={`${rate.on_cost_type}-${rate.employment_type}-${rate.year}`}
              >
                <Td className="tabular">{rate.year}</Td>
                <Td>{ON_COST_LABELS[rate.on_cost_type]}</Td>
                <Td>{rate.employment_type || 'All'}</Td>
                <Td align="right" className="tabular">
                  {percentage(rate.rate)}
                </Td>
              </tr>
            ))}
          </tbody>
        </Grid>
      </Panel>
    </div>
  )
}
