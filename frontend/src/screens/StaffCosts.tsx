import { useBudget, useStaffLines } from '@/api/budget-lines'
import { Note, Panel } from '@/components/shell'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { withCosts } from '@/lib/staff'
import type { LookupTables } from '@/types'
import { StaffTable } from './staff/StaffTable'

export interface StaffCostsProps {
  lookups: LookupTables
}

export function StaffCosts({ lookups }: StaffCostsProps) {
  const { data: budget } = useBudget()
  const staff = useStaffLines(budget.years)

  return (
    <>
      <Alert>
        <AlertDescription>
          Staff costs include the base salary plus salary on-costs plus
          overheads. The base salary rate shown is as at <b>01-Nov-2025</b>;
          EBA-mandated increases are applied automatically for later years.
        </AlertDescription>
      </Alert>

      <Panel
        title="Direct Salary and On-Costs Paid by the Project"
        className="mt-4"
      >
        <StaffTable
          lines={withCosts(staff.lines, budget)}
          years={staff.years}
          columnTotal={budget.staff_cost.column_total}
          salaryRates={lookups.salary_rates}
          multipliers={lookups.salary_rate_multipliers}
          patchLine={staff.patchLine}
          removeLine={staff.removeLine}
          addLine={staff.addLine}
        />

        <Note>
          Overheads are calculated by applying the cost recovery multiplier to
          base salary plus salary on-costs.
        </Note>
      </Panel>
    </>
  )
}
