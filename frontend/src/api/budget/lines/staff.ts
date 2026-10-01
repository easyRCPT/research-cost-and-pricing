import { useBudgetId } from '@/api/budget/context'
import { useBudget } from '@/api/budget/detail'
import { useEdit } from '@/api/budget/write'
import { emptyStaffLine, isRated } from '@/lib/staff'
import type {
  BudgetDetail,
  EditableStaffLine,
  RatedStaffLine,
  StaffLine,
  StaffLineInput,
} from '@/types'

import { useDraftRows } from './draftRows'
import { useLineMutations } from './mutations'
import {
  byPosition,
  coalesceKey,
  createOnce,
  patchCommands,
  type StaffLines,
} from './shared'

/** Fields of a staff row the API takes one at a time. */
const STAFF_FIELDS = new Set<string>([
  'name_role',
  'classification',
  'employment_type',
  'category',
  'time_basis',
  'in_kind',
  'in_kind_reason',
])

const toStaffInput = (line: RatedStaffLine): StaffLineInput => ({
  id: line.id,
  name_role: line.name_role,
  employment_type: line.employment_type as StaffLineInput['employment_type'],
  category: line.category as StaffLineInput['category'],
  classification: line.classification,
  time_basis: line.time_basis as StaffLineInput['time_basis'],
  in_kind: line.in_kind,
  in_kind_reason: line.in_kind_reason,
  allocations: line.by_year
    .filter((entry) => entry.time > 0)
    .map(({ year, time }) => ({ year, time })),
})

/**
 * The typed value over the priced one.
 *
 * A patch carries what someone entered, which no round trip can echo back
 * faster than they typed it. It does not carry money. `withTime` rebuilds the
 * whole by_year array to change one year's time, and the costs it copies
 * across are the ones from before the edit -- so spreading the patch whole
 * would put the cost of the old time beside the new one, and leave it there.
 *
 * Time comes from the patch; every computed figure stays as the reply left it.
 */
const withEnteredTime = (
  line: StaffLine,
  patch: Partial<EditableStaffLine>,
): StaffLine => {
  // This helper only echoes edits to saved server rows. Choice controls only
  // offer API enum values, so those fields remain within the response type.
  const merged = { ...line, ...patch } as StaffLine
  if (!patch.by_year) return merged

  return {
    ...merged,
    by_year: line.by_year.map((priced) => {
      const entered = patch.by_year?.find((year) => year.year === priced.year)
      return entered ? { ...priced, time: entered.time } : priced
    }),
  }
}

/** The row as it is shown, patched in place wherever the reply put it. */
const echoStaffLine =
  (id: string, patch: Partial<EditableStaffLine>) =>
  (budget: BudgetDetail): BudgetDetail => {
    const apply = (lines: StaffLine[]) =>
      lines.map((line) =>
        line.id === id ? withEnteredTime(line, patch) : line,
      )

    return {
      ...budget,
      staff_cost: {
        ...budget.staff_cost,
        lines: apply(budget.staff_cost.lines),
      },
      staff_in_kind_cost: {
        ...budget.staff_in_kind_cost,
        lines: apply(budget.staff_in_kind_cost.lines),
      },
    }
  }

export function useStaffLines(years: number[]): StaffLines {
  const budgetId = useBudgetId()
  const { data: budget } = useBudget()
  const edit = useEdit()
  const { createStaff, deleteStaff } = useLineMutations()

  const saved = [
    ...budget.staff_cost.lines,
    ...budget.staff_in_kind_cost.lines,
  ].sort(byPosition)

  const rows = useDraftRows('staff', saved, years, emptyStaffLine)

  return {
    lines: rows.lines,
    years,

    addLine: rows.addLine,

    removeLine: (id) =>
      rows.removeLine(id, (lineId) => deleteStaff.mutate(lineId)),

    patchLine: (id, patch) => {
      if (rows.isDraft(id)) {
        const next = rows.patchDraft(id, patch)
        if (!next) return

        // Complete enough for the engine to rate: it belongs to the server now.
        //
        // The row stays in the draft layer until the reply lands. Dropping it
        // here meant a line the server refused -- over the time cap, a value
        // the serializer would not take -- was gone from both places at once:
        // removed from drafts, never saved, and the toast talking about a row
        // that was no longer on screen.
        if (isRated(next))
          createOnce(budgetId, id, () =>
            createStaff.mutate({ draftId: id, body: toStaffInput(next) }),
          )
        return
      }

      const current = saved.find((row) => row.id === id)
      if (!current) return

      const commands = patchCommands(
        'staff',
        id,
        current,
        patch,
        STAFF_FIELDS,
        'time',
      )

      edit(commands, echoStaffLine(id, patch), coalesceKey('staff', id, patch))
    },
  }
}
