import { Grid, Panel, Td, Th } from '@/components/shell'
import { money2 } from '@/lib/format/utils'
import type { LookupTables } from '@/types'

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
      <Panel
        title="Salary Rates"
        description={`${salaryRates.length} rows. Fortnightly rates are displayed annual; casual rates are displayed hourly.`}
      >
        <Grid className="max-h-[560px]">
          <thead className="sticky top-0 z-10">
            <tr>
              <Th>Payroll type</Th>
              <Th>Category</Th>
              <Th>Classification</Th>
              <Th align="right">Rate</Th>
            </tr>
          </thead>
          <tbody>
            {salaryRates.map((rate) => (
              <tr
                key={`${rate.payroll_type}-${rate.category}-${rate.classification}`}
              >
                <Td>{rate.payroll_type}</Td>
                <Td>{rate.category}</Td>
                <Td>{rate.classification}</Td>
                <Td align="right" className="tabular">
                  {money2(rate.rate)}
                </Td>
              </tr>
            ))}
          </tbody>
        </Grid>
      </Panel>

      <Panel
        title="Time basis multipliers"
        description="Applied to the annual rate for the time basis a staff line is costed on."
      >
        <Grid>
          <thead>
            <tr>
              <Th>Time basis</Th>
              <Th align="right">Multiplier</Th>
            </tr>
          </thead>
          <tbody>
            {multipliers.map((multiplier) => (
              <tr key={multiplier.time_basis}>
                <Td>{multiplier.time_basis}</Td>
                <Td align="right" className="tabular">
                  {multiplier.multiplier.toFixed(6)}
                </Td>
              </tr>
            ))}
          </tbody>
        </Grid>
      </Panel>
    </div>
  )
}
