import { useBudget, useCiCostsIncluded, useStaffLines } from '@/api/budget'
import { Note, Panel } from '@/components/shell'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { ciLineId, withCiName, withCosts } from '@/lib/staff'
import type { LookupTables } from '@/types'
import { StaffTable } from './staff/StaffTable'

export interface StaffCostsProps {
  lookups: LookupTables
}

export function StaffCosts({ lookups }: StaffCostsProps) {
  const { data: budget } = useBudget()
  const staff = useStaffLines(budget.years)
  const { included, setIncluded } = useCiCostsIncluded()

  const chiefInvestigator = budget.project_info.chief_investigator
  const lines = withCiName(withCosts(staff.lines, budget), chiefInvestigator)
  const ciId = ciLineId(lines, chiefInvestigator)
  // Nothing to leave out of the costing until the project names a CI.
  const hasCi = ciId !== null

  return (
    <>
      <Alert>
        <AlertDescription>
          Staff costs include the base salary plus salary on-costs plus
          overheads. The base salary rate shown is as at <b>01-Nov-2025</b>;
          EBA-mandated increases are applied automatically for later years.
        </AlertDescription>
      </Alert>

      {hasCi && !included && (
        <Alert className="mt-3 border-warn-line bg-warn-bg text-warn">
          <AlertDescription className="text-warn">
            <b>CI time is not costed.</b> It is not charged to the funder, and
            it is not counted as in-kind either.
          </AlertDescription>
        </Alert>
      )}

      <Panel
        title="Direct Salary and On-Costs Paid by the Project"
        className="mt-4"
      >
        <div className="mb-4 flex items-center gap-3 rounded-md border bg-muted/40 px-3 py-2.5">
          <Checkbox
            id="ci-costs"
            disabled={!hasCi}
            checked={included}
            onCheckedChange={(value) => setIncluded(value === true)}
          />
          <Label
            htmlFor="ci-costs"
            className={hasCi ? undefined : 'text-muted-foreground'}
          >
            Include CI cost
          </Label>
          {!hasCi && (
            <span className="text-[13px] text-muted-foreground">
              Name a chief investigator on Project Details first.
            </span>
          )}
        </div>

        <StaffTable
          lines={lines}
          years={staff.years}
          columnTotal={budget.staff_cost.column_total}
          salaryRates={lookups.salary_rates}
          multipliers={lookups.salary_rate_multipliers}
          ciId={ciId}
          ciIncluded={included}
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
