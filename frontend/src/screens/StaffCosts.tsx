import { useBudget, useLines } from '@/api/budget'
import { useLookups } from '@/api/lookups'
import { EditableGrid, Note, Panel } from '@/components/shell'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { ciLineId, withCiName, withCosts } from '@/lib/staff'

import { StaffTableBody } from './staff/StaffTableBody'
import { StaffTableFooter } from './staff/StaffTableFooter'
import { StaffTableHeader } from './staff/StaffTableHeader'

export function StaffCosts() {
  const { data: budget } = useBudget()
  const { data: lookups } = useLookups()
  const staff = useLines('staff', budget.years)

  const chiefInvestigator = budget.project_info.chief_investigator
  // The CI's row leads, as in the workbook, wherever it was added: a new row
  // otherwise lands after the blank rows waiting to be filled.
  const lines = withCiName(
    withCosts(staff.lines, budget),
    chiefInvestigator,
  ).sort((a, b) => Number(b.is_ci) - Number(a.is_ci))
  // The CI's cost is included when the costing has a CI row (#166): ticking
  // adds one, named after the CI, and unticking removes it. No other row is
  // ever taken for the CI's.
  const ciId = ciLineId(lines, chiefInvestigator)
  const ciNamed = chiefInvestigator.trim() !== ''
  const setIncluded = (include: boolean) => {
    if (include && ciId === null) {
      staff.addLine({ is_ci: true, name_role: chiefInvestigator.trim() })
    } else if (!include && ciId !== null) {
      staff.removeLine(ciId)
    }
  }

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
        <div className="mb-4 flex items-center gap-3 rounded-md border bg-muted/40 px-3 py-2.5">
          <Checkbox
            id="ci-costs"
            disabled={!ciNamed}
            checked={ciId !== null}
            onCheckedChange={(value) => setIncluded(value === true)}
          />
          <Label
            htmlFor="ci-costs"
            className={ciNamed ? undefined : 'text-muted-foreground'}
          >
            Include Chief Investigator cost
          </Label>
          {!ciNamed && (
            <span className="text-[13px] text-muted-foreground">
              Name a chief investigator on Project Details first.
            </span>
          )}
        </div>

        <EditableGrid onAdd={staff.addLine}>
          <StaffTableHeader years={staff.years} />
          <StaffTableBody
            lines={lines}
            years={staff.years}
            salaryRates={lookups.salary_rates}
            multipliers={lookups.salary_rate_multipliers}
            ciId={ciId}
            patchLine={staff.patchLine}
            removeLine={staff.removeLine}
          />
          <StaffTableFooter
            years={staff.years}
            columnTotal={budget.staff_cost.column_total}
          />
        </EditableGrid>

        <Note>
          Overheads are calculated by applying the cost recovery multiplier to
          base salary plus salary on-costs.
        </Note>
      </Panel>
    </>
  )
}
