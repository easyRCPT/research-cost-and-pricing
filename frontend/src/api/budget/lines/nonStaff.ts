import { useEffect } from 'react'

import { useLookups } from '@/api/lookups'
import { STARTING_ROWS } from '@/lib/constants'
import { emptyNonStaffLine } from '@/lib/non-staff'
import type { BudgetDetail, NonStaffLine, NonStaffLineInput } from '@/types'
import { useBudgetId } from '@/api/budget/context'
import { useBudget } from '@/api/budget/detail'
import { getDrafts, setDrafts, useDrafts } from '@/api/budget/drafts'
import { useEdit, type Command } from '@/api/budget/write'
import { useLineMutations } from './mutations'
import {
  blankRows,
  byPosition,
  coalesceKey,
  creating,
  inFlight,
  type NonStaffLines,
} from './shared'

const NON_STAFF_FIELDS = new Set<string>([
  'description',
  'in_kind',
  'in_kind_reason',
  'add_ten_percent',
  'indirect_rate_multiplier',
])

const isCosted = (line: NonStaffLine) =>
  line.cost_group !== '' && line.expense_type !== ''

const toNonStaffInput = (line: NonStaffLine): NonStaffLineInput => ({
  id: line.id,
  cost_group: line.cost_group,
  expense_type: line.expense_type,
  description: line.description,
  in_kind: line.in_kind,
  in_kind_reason: line.in_kind_reason,
  add_ten_percent: line.add_ten_percent,
  indirect_rate_multiplier: line.indirect_rate_multiplier,
  amounts: line.by_year
    .filter((entry) => entry.amount > 0)
    .map(({ year, amount }) => ({ year, amount })),
})

const echoNonStaffLine =
  (id: string, patch: Partial<NonStaffLine>) =>
  (budget: BudgetDetail): BudgetDetail => {
    const apply = (lines: NonStaffLine[]) =>
      lines.map((line) => (line.id === id ? { ...line, ...patch } : line))

    return {
      ...budget,
      non_staff_cost: {
        ...budget.non_staff_cost,
        lines: apply(budget.non_staff_cost.lines),
      },
      non_staff_in_kind_cost: {
        ...budget.non_staff_in_kind_cost,
        lines: apply(budget.non_staff_in_kind_cost.lines),
      },
    }
  }

function ensureBlankNonStaffRows(
  budgetId: number,
  years: number[],
  saved: number,
) {
  const drafts = getDrafts(budgetId)
  if (drafts.non_staff.length > 0) return
  const count = saved === 0 ? STARTING_ROWS : 1
  setDrafts(budgetId, {
    ...drafts,
    non_staff: blankRows(count, emptyNonStaffLine, years),
  })
}

export function useNonStaffLines(years: number[]): NonStaffLines {
  const budgetId = useBudgetId()
  const { data: budget } = useBudget()
  const { data: lookups } = useLookups()
  const drafts = useDrafts()
  const edit = useEdit()
  const { createNonStaff, deleteNonStaff } = useLineMutations()

  const saved = [
    ...budget.non_staff_cost.lines,
    ...budget.non_staff_in_kind_cost.lines,
  ].sort(byPosition)

  const savedIds = new Set(saved.map((line) => line.id))
  const isDraft = (id: string) => !savedIds.has(id)
  const lines = [...saved, ...drafts.non_staff.filter((row) => isDraft(row.id))]

  const blanks = drafts.non_staff.length
  useEffect(() => {
    if (blanks === 0) ensureBlankNonStaffRows(budgetId, years, saved.length)
  }, [blanks, saved.length, budgetId, years])

  const writeDrafts = (rows: NonStaffLine[]) =>
    setDrafts(budgetId, { ...getDrafts(budgetId), non_staff: rows })

  /** The expense type a row is booked against, as the API names it. */
  const ledgerId = (costGroup: string, expenseType: string) =>
    lookups.non_staff_cost_categories.find(
      (category) =>
        category.cost_category === costGroup &&
        category.cost_subcategory === expenseType,
    )?.ledger_id

  return {
    lines,
    years,

    addLine: () =>
      writeDrafts([
        ...getDrafts(budgetId).non_staff,
        emptyNonStaffLine(crypto.randomUUID(), years),
      ]),

    removeLine: (id) => {
      if (isDraft(id)) {
        writeDrafts(
          getDrafts(budgetId).non_staff.filter((row) => row.id !== id),
        )
        return
      }
      deleteNonStaff.mutate(id)
    },

    patchLine: (id, patch) => {
      if (isDraft(id)) {
        const current = getDrafts(budgetId).non_staff.find(
          (row) => row.id === id,
        )
        if (!current) return
        const next = { ...current, ...patch }

        // Kept until the server has it, for the same reason as a staff row.
        if (isCosted(next)) {
          writeDrafts(
            getDrafts(budgetId).non_staff.map((row) =>
              row.id === id ? next : row,
            ),
          )
          const key = inFlight(budgetId, id)
          if (!creating.has(key)) {
            creating.add(key)
            createNonStaff.mutate({ draftId: id, body: toNonStaffInput(next) })
          }
          return
        }

        writeDrafts(
          getDrafts(budgetId).non_staff.map((row) =>
            row.id === id ? next : row,
          ),
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
            if (before?.amount !== entry.amount)
              commands.push({
                section: 'non_staff',
                field: 'year_value',
                row_id: id,
                year: entry.year,
                value: entry.amount,
              } as Command)
          }
          continue
        }

        if (
          NON_STAFF_FIELDS.has(field) &&
          value !== current[field as keyof NonStaffLine]
        )
          commands.push({
            section: 'non_staff',
            field,
            row_id: id,
            value,
          } as Command)
      }

      // Cost group and expense type are two halves of one stored category, so
      // they only reach the server once both name a real one.
      const next = { ...current, ...patch }
      if (patch.cost_group !== undefined || patch.expense_type !== undefined) {
        const ledger = ledgerId(next.cost_group, next.expense_type)
        if (ledger !== undefined)
          commands.push({
            section: 'non_staff',
            field: 'category',
            row_id: id,
            value: ledger,
          } as Command)
      }

      edit(
        commands,
        echoNonStaffLine(id, patch),
        coalesceKey('non_staff', id, patch),
      )
    },
  }
}
