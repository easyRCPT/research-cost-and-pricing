import { DataTable, TableCard, columnHelper } from '@/components/data-table'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { money2 } from '@/lib/format/utils'
import type { LookupTables } from '@/types'

type SalaryRate = LookupTables['salary_rates'][number]
type Multiplier = LookupTables['salary_rate_multipliers'][number]

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

const multiplier = columnHelper<Multiplier>()
const MULTIPLIER_COLUMNS = multiplier.columns([
  multiplier.accessor('time_basis', { header: 'Time basis' }),
  multiplier.accessor('multiplier', {
    header: 'Multiplier',
    cell: ({ getValue }) => getValue().toFixed(6),
    meta: { align: 'right', className: 'tabular' },
  }),
])

const byRate = (row: SalaryRate) =>
  `${row.payroll_type}-${row.category}-${row.classification}`
const byTimeBasis = (row: Multiplier) => row.time_basis

interface SalaryRatesTabProps {
  salaryRates: LookupTables['salary_rates']
  multipliers: LookupTables['salary_rate_multipliers']
}

export function SalaryRatesTab({
  salaryRates,
  multipliers,
}: SalaryRatesTabProps) {
  return (
    <div className="space-y-4">
      <Alert>
        <AlertDescription>
          Fortnightly rates are displayed <b>annual</b>; casual rates are
          displayed <b>hourly</b>.
        </AlertDescription>
      </Alert>
      <TableCard
        tables={[
          {
            value: 'rates',
            title: 'Salary Rates',
            table: (
              <DataTable
                columns={RATE_COLUMNS}
                rows={salaryRates}
                getRowId={byRate}
              />
            ),
          },
          {
            value: 'multipliers',
            title: 'Time basis multipliers',
            table: (
              <DataTable
                columns={MULTIPLIER_COLUMNS}
                rows={multipliers}
                getRowId={byTimeBasis}
              />
            ),
          },
        ]}
      />
    </div>
  )
}
