import { useBudget, useLines } from '@/api/budget'
import { useLookups } from '@/api/lookups'
import { Panel } from '@/components/shell'

import { NonStaffTable } from './nonstaff/NonStaffTable'

export function NonStaffCosts() {
  const { data: budget } = useBudget()
  const { data: lookups } = useLookups()
  const { lines, years, patchLine, addLine, removeLine } = useLines(
    'non_staff',
    budget.years,
  )

  return (
    <Panel>
      <NonStaffTable
        years={years}
        lines={lines}
        categories={lookups.non_staff_cost_categories}
        columnTotal={budget.non_staff_cost.column_total}
        patchLine={patchLine}
        removeLine={removeLine}
        addLine={addLine}
      />

      <p className="mt-4 max-w-[100ch] text-xs text-muted-foreground">
        * Additional costs can be difficult to determine. If no better method is
        available they can be estimated at roughly 10% of the cost of the item.
        This is not appropriate for Student Support or Shared Grant Payments and
        is unavailable in those groups.
      </p>
    </Panel>
  )
}
