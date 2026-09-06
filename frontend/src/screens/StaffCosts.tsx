import { useState } from 'react'
import {
  useAddStaffLine,
  useBudget,
  useRemoveStaffLine,
  useUpdateStaffField,
} from '@/api/budget-lines'
import { Note, Panel } from '@/components/shell'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { emptyStaffLine, isComplete, timeFor, toInput } from '@/lib/staff'
import type { LookupTables, StaffLine } from '@/types'
import { STARTING_ROWS } from '@/lib/constants'
import { StaffTable } from './staff/StaffTable'

const startingIds = () =>
  Array.from({ length: STARTING_ROWS }, (_, index) => -(index + 1))

export interface StaffCostsProps {
  budgetId: number
  lookups: LookupTables
}

export function StaffCosts({ budgetId, lookups }: StaffCostsProps) {
  const { data: budget } = useBudget(budgetId)
  const addStaffLine = useAddStaffLine(budgetId)
  const removeStaffLine = useRemoveStaffLine(budgetId)
  const updateStaffField = useUpdateStaffField(budgetId)
  const [draftIds, setDraftIds] = useState<number[]>(startingIds)
  const [draftEdits, setDraftEdits] = useState<
    Record<number, Partial<StaffLine>>
  >({})

  const years = budget.years
  const saved = budget.staff_cost.lines
  const drafts = draftIds.map((id) => ({
    ...emptyStaffLine(id, years),
    ...draftEdits[id],
  }))
  const lines = [...saved, ...drafts]

  const discardDraft = (id: number) => {
    setDraftIds((current) => current.filter((draftId) => draftId !== id))
    setDraftEdits((current) => {
      const next = { ...current }
      delete next[id]
      return next
    })
  }

  const patchDraft = (id: number, patch: Partial<StaffLine>) => {
    const updated = {
      ...emptyStaffLine(id, years),
      ...draftEdits[id],
      ...patch,
    }
    if (isComplete(updated)) {
      discardDraft(id)
      addStaffLine.mutate(toInput(updated))
      return
    }
    setDraftEdits((current) => ({
      ...current,
      [id]: { ...current[id], ...patch },
    }))
  }

  const patchSaved = (id: number, patch: Partial<StaffLine>) => {
    const line = saved.find((row) => row.id === id)
    if (!line) return
    const [field, value] = Object.entries(patch)[0]
    if (field !== 'by_year') {
      updateStaffField.mutate({ row_id: id, field, value })
      return
    }
    const next = { ...line, by_year: patch.by_year! }
    const changed = years.find(
      (year) => timeFor(next, year) !== timeFor(line, year),
    )
    if (changed === undefined) return
    updateStaffField.mutate({
      row_id: id,
      field: 'year_value',
      year: changed,
      value: timeFor(next, changed),
    })
  }

  const patchLine = (id: number, patch: Partial<StaffLine>) =>
    id > 0 ? patchSaved(id, patch) : patchDraft(id, patch)

  const removeLine = (id: number) =>
    id > 0 ? removeStaffLine.mutate(id) : discardDraft(id)

  const addLine = () =>
    setDraftIds((current) => [...current, Math.min(0, ...current) - 1])

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
          lines={lines}
          years={years}
          columnTotal={budget.staff_cost.column_total}
          salaryRates={lookups.salary_rates}
          multipliers={lookups.salary_rate_multipliers}
          patchLine={patchLine}
          removeLine={removeLine}
          addLine={addLine}
        />

        <Note>
          Overheads are calculated by applying the cost recovery multiplier to
          base salary plus salary on-costs.
        </Note>
      </Panel>
    </>
  )
}
