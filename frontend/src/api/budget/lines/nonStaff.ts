import { useBudgetId } from '@/api/budget/context'
import { useBudget } from '@/api/budget/detail'
import { type Command, useEdit } from '@/api/budget/write'
import { useLookups } from '@/api/lookups'
import { emptyNonStaffLine } from '@/lib/non-staff'
import type { BudgetDetail, NonStaffLine, NonStaffLineInput } from '@/types'

import { useDraftRows } from './draftRows'
import { useLineMutations } from './mutations'
import {
  byPosition,
  coalesceKey,
  createOnce,
  type NonStaffLines,
  patchCommands,
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

export function useNonStaffLines(years: number[]): NonStaffLines {
  const budgetId = useBudgetId()
  const { data: budget } = useBudget()
  const { data: lookups } = useLookups()
  const edit = useEdit()
  const { createNonStaff, deleteNonStaff } = useLineMutations()

  const saved = [
    ...budget.non_staff_cost.lines,
    ...budget.non_staff_in_kind_cost.lines,
  ].sort(byPosition)

  const rows = useDraftRows('non_staff', saved, years, emptyNonStaffLine)

  /** The expense type a row is booked against, as the API names it. */
  const ledgerId = (costGroup: string, expenseType: string) =>
    lookups.non_staff_cost_categories.find(
      (category) =>
        category.cost_category === costGroup &&
        category.cost_subcategory === expenseType,
    )?.ledger_id

  return {
    lines: rows.lines,
    years,

    addLine: rows.addLine,

    removeLine: (id) =>
      rows.removeLine(id, (lineId) => deleteNonStaff.mutate(lineId)),

    patchLine: (id, patch) => {
      if (rows.isDraft(id)) {
        const next = rows.patchDraft(id, patch)
        if (!next) return

        // Kept until the server has it, for the same reason as a staff row.
        if (isCosted(next))
          createOnce(budgetId, id, () =>
            createNonStaff.mutate({ draftId: id, body: toNonStaffInput(next) }),
          )
        return
      }

      const current = saved.find((row) => row.id === id)
      if (!current) return

      const commands: Command[] = patchCommands(
        'non_staff',
        id,
        current,
        patch,
        NON_STAFF_FIELDS,
        'amount',
      )

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
