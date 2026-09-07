import type { LookupTables, NonStaffLine } from '@/types'
import { Panel } from '@/components/shell'
import { NonStaffTable } from './nonstaff/NonStaffTable'
import { emptyNonStaffLine } from '@/lib/non-staff'
import { nextTempId } from '@/lib/utils'
import type { Dispatch, SetStateAction } from 'react'

export interface NonStaffCostsProps {
  lines: NonStaffLine[]
  years: number[]
  setLines: Dispatch<SetStateAction<NonStaffLine[]>>
  lookups: LookupTables
}

export function NonStaffCosts({
  lines,
  years,
  setLines,
  lookups,
}: NonStaffCostsProps) {
  const patchLine = (id: number, patch: Partial<NonStaffLine>) =>
    setLines((lines) =>
      lines.map((line) => (line.id === id ? { ...line, ...patch } : line)),
    )
  const addLine = () =>
    setLines((lines) => [...lines, emptyNonStaffLine(nextTempId(lines), years)])
  const removeLine = (id: number) =>
    setLines((lines) => lines.filter((line) => line.id !== id))

  return (
    <Panel>
      <NonStaffTable
        years={years}
        lines={lines}
        categories={lookups.non_staff_cost_categories}
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
