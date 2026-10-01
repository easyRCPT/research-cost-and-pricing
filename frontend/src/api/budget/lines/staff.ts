import { useEffect } from 'react'

import { useBudgetId } from '@/api/budget/context'
import { useBudget } from '@/api/budget/detail'
import { getDrafts, setDrafts, useDrafts } from '@/api/budget/drafts'
import { type Command,useEdit } from '@/api/budget/write'
import { STARTING_ROWS } from '@/lib/constants'
import { emptyStaffLine, isRated } from '@/lib/staff'
import type {
  BudgetDetail,
  EditableStaffLine,
  RatedStaffLine,
  StaffLine,
  StaffLineInput,
} from '@/types'

import { useLineMutations } from './mutations'
import {
  blankRows,
  byPosition,
  coalesceKey,
  creating,
  inFlight,
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

function ensureBlankStaffRows(
  budgetId: number,
  years: number[],
  saved: number,
) {
  const drafts = getDrafts(budgetId)
  if (drafts.staff.length > 0) return
  const count = saved === 0 ? STARTING_ROWS : 1
  setDrafts(budgetId, {
    ...drafts,
    staff: blankRows(count, emptyStaffLine, years),
  })
}

export function useStaffLines(years: number[]): StaffLines {
  const budgetId = useBudgetId()
  const { data: budget } = useBudget()
  const drafts = useDrafts()
  const edit = useEdit()
  const { createStaff, deleteStaff } = useLineMutations()

  const saved = [
    ...budget.staff_cost.lines,
    ...budget.staff_in_kind_cost.lines,
  ].sort(byPosition)

  // A draft keeps its id once saved, so the server having it is what ends it.
  const savedIds = new Set(saved.map((line) => line.id))
  const isDraft = (id: string) => !savedIds.has(id)
  const lines = [...saved, ...drafts.staff.filter((row) => isDraft(row.id))]

  const blanks = drafts.staff.length
  useEffect(() => {
    if (blanks === 0) ensureBlankStaffRows(budgetId, years, saved.length)
  }, [blanks, saved.length, budgetId, years])

  const writeDrafts = (rows: EditableStaffLine[]) =>
    setDrafts(budgetId, { ...getDrafts(budgetId), staff: rows })

  return {
    lines,
    years,

    addLine: () =>
      writeDrafts([
        ...getDrafts(budgetId).staff,
        emptyStaffLine(crypto.randomUUID(), years),
      ]),

    removeLine: (id) => {
      if (isDraft(id)) {
        writeDrafts(getDrafts(budgetId).staff.filter((row) => row.id !== id))
        return
      }
      deleteStaff.mutate(id)
    },

    patchLine: (id, patch) => {
      if (isDraft(id)) {
        const current = getDrafts(budgetId).staff.find((row) => row.id === id)
        if (!current) return
        const next = { ...current, ...patch }

        // Complete enough for the engine to rate: it belongs to the server now.
        //
        // The row stays in the draft layer until the reply lands. Dropping it
        // here meant a line the server refused -- over the time cap, a value
        // the serializer would not take -- was gone from both places at once:
        // removed from drafts, never saved, and the toast talking about a row
        // that was no longer on screen.
        if (isRated(next)) {
          writeDrafts(
            getDrafts(budgetId).staff.map((row) =>
              row.id === id ? next : row,
            ),
          )
          const key = inFlight(budgetId, id)
          if (!creating.has(key)) {
            creating.add(key)
            createStaff.mutate({ draftId: id, body: toStaffInput(next) })
          }
          return
        }

        writeDrafts(
          getDrafts(budgetId).staff.map((row) => (row.id === id ? next : row)),
        )
        return
      }

      const current = saved.find((row) => row.id === id)
      if (!current) return

      const commands: Command[] = []

      for (const [field, value] of Object.entries(patch)) {
        if (field === 'by_year') {
          for (const entry of patch.by_year ?? []) {
            const before = current.by_year.find(
              (year) => year.year === entry.year,
            )
            if (before?.time !== entry.time)
              commands.push({
                section: 'staff',
                field: 'year_value',
                row_id: id,
                year: entry.year,
                value: entry.time,
              } as Command)
          }
          continue
        }

        if (
          STAFF_FIELDS.has(field) &&
          value !== current[field as keyof StaffLine]
        )
          commands.push({
            section: 'staff',
            field,
            row_id: id,
            value,
          } as Command)
      }

      edit(commands, echoStaffLine(id, patch), coalesceKey('staff', id, patch))
    },
  }
}
