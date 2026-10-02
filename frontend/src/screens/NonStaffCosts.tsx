import { useBudget, useLines } from '@/api/budget'
import { useLookups } from '@/api/lookups'
import { EditableGrid, Panel } from '@/components/shell'

import { NonStaffTableBody } from './nonstaff/NonStaffTableBody'
import { NonStaffTableFooter } from './nonstaff/NonStaffTableFooter'
import { NonStaffTableHeader } from './nonstaff/NonStaffTableHeader'

export function NonStaffCosts() {
  const { data: budget } = useBudget()
  const { data: lookups } = useLookups()
  const { lines, years, patchLine, addLine, removeLine } = useLines(
    'non_staff',
    budget.years,
  )

  return (
    <Panel>
      <EditableGrid onAdd={addLine}>
        <NonStaffTableHeader years={years} />
        <NonStaffTableBody
          lines={lines}
          years={years}
          categories={lookups.non_staff_cost_categories}
          patchLine={patchLine}
          removeLine={removeLine}
        />
        <NonStaffTableFooter columnTotal={budget.non_staff_cost.column_total} />
      </EditableGrid>

      <p className="mt-4 max-w-[100ch] text-xs text-muted-foreground">
        * Additional costs can be difficult to determine. If no better method is
        available they can be estimated at roughly 10% of the cost of the item.
        This is not appropriate for Student Support or Shared Grant Payments and
        is unavailable in those groups.
      </p>
    </Panel>
  )
}
