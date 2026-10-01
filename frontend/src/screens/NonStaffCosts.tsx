import { type NonStaffLines, useBudget } from '@/api/budget'
import { Panel } from '@/components/shell'
import type { LookupTables } from '@/types'

import { NonStaffTable } from './nonstaff/NonStaffTable'

export interface NonStaffCostsProps extends NonStaffLines {
  lookups: LookupTables
}

export function NonStaffCosts({
  lines,
  years,
  patchLine,
  addLine,
  removeLine,
  lookups,
}: NonStaffCostsProps) {
  const { data: budget } = useBudget()

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
