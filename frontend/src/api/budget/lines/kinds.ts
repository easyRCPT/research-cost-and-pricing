import { type Drafts } from '@/api/budget/drafts'
import type { Command } from '@/api/budget/write'
import { api, unwrap } from '@/lib/api'
import { emptyNonStaffLine } from '@/lib/non-staff'
import { emptyStaffLine, isRated } from '@/lib/staff'
import type {
  BudgetDetail,
  EditableStaffLine,
  LookupTables,
  NonStaffLine,
  NonStaffLineInput,
  StaffLine,
  StaffLineInput,
} from '@/types'

import { byPosition, patchCommands } from './shared'

export type LineKind = 'staff' | 'non_staff'
export type Row<K extends LineKind> = Drafts[K][number]
export type LineInput<K extends LineKind> = {
  staff: StaffLineInput
  non_staff: NonStaffLineInput
}[K]

/** Everything that differs between a staff row and a non-staff one. */
interface LineKindSpec<K extends LineKind> {
  empty: (id: string, years: number[]) => Row<K>
  saved: (budget: BudgetDetail) => Row<K>[]
  /** The body to create the row with, once it is complete enough to save. */
  toInput: (row: Row<K>) => LineInput<K> | undefined
  commands: (
    id: string,
    current: Row<K>,
    patch: Partial<Row<K>>,
    lookups: LookupTables,
  ) => Command[]
  echo: (
    id: string,
    patch: Partial<Row<K>>,
  ) => (budget: BudgetDetail) => BudgetDetail
  create: (budgetId: number, body: LineInput<K>) => Promise<BudgetDetail>
  remove: (budgetId: number, lineId: string) => Promise<BudgetDetail>
  /** The row as a toast names it. */
  label: (row?: Row<K>) => string
}

/** Fields of a staff row the API takes one at a time. */
const STAFF_FIELDS = new Set<string>([
  'name_role',
  'classification',
  'employment_type',
  'category',
  'time_basis',
  'in_kind',
  'in_kind_reason',
  'is_ci',
])

const NON_STAFF_FIELDS = new Set<string>([
  'description',
  'in_kind',
  'in_kind_reason',
  'add_ten_percent',
])

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

const staff: LineKindSpec<'staff'> = {
  empty: emptyStaffLine,

  saved: (budget) =>
    [...budget.staff_cost.lines, ...budget.staff_in_kind_cost.lines].sort(
      byPosition,
    ),

  // Complete enough for the engine to rate: it belongs to the server now.
  toInput: (line) =>
    isRated(line)
      ? {
          id: line.id,
          name_role: line.name_role,
          employment_type: line.employment_type,
          category: line.category,
          classification: line.classification,
          time_basis: line.time_basis,
          in_kind: line.in_kind,
          in_kind_reason: line.in_kind_reason,
          is_ci: line.is_ci,
          allocations: line.by_year
            .filter((entry) => entry.time > 0)
            .map(({ year, time }) => ({ year, time })),
        }
      : undefined,

  commands: (id, current, patch) =>
    patchCommands('staff', id, current, patch, STAFF_FIELDS, 'time'),

  /** The row as it is shown, patched in place wherever the reply put it. */
  echo: (id, patch) => (budget) => {
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
  },

  create: async (budgetId, body) =>
    unwrap(
      await api.POST('/api/budgets/{budget_id}/staff-lines/', {
        params: { path: { budget_id: budgetId } },
        body,
      }),
    ),

  remove: async (budgetId, lineId) =>
    unwrap(
      await api.DELETE('/api/budgets/{budget_id}/staff-lines/{line_id}/', {
        params: { path: { budget_id: budgetId, line_id: lineId } },
      }),
    ),

  label: (row) => row?.name_role?.trim() || 'A staff row',
}

const nonStaff: LineKindSpec<'non_staff'> = {
  empty: emptyNonStaffLine,

  saved: (budget) =>
    [
      ...budget.non_staff_cost.lines,
      ...budget.non_staff_in_kind_cost.lines,
    ].sort(byPosition),

  toInput: (line) =>
    line.cost_group !== '' && line.expense_type !== ''
      ? {
          id: line.id,
          cost_group: line.cost_group,
          expense_type: line.expense_type,
          description: line.description,
          in_kind: line.in_kind,
          in_kind_reason: line.in_kind_reason,
          add_ten_percent: line.add_ten_percent,
          amounts: line.by_year
            .filter((entry) => entry.amount > 0)
            .map(({ year, amount }) => ({ year, amount })),
        }
      : undefined,

  commands: (id, current, patch, lookups) => {
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
    if (patch.cost_group !== undefined || patch.expense_type !== undefined) {
      const next = { ...current, ...patch }
      const ledger = lookups.non_staff_cost_categories.find(
        (category) =>
          category.cost_category === next.cost_group &&
          category.cost_subcategory === next.expense_type,
      )?.ledger_id
      if (ledger !== undefined)
        commands.push({
          section: 'non_staff',
          field: 'category',
          row_id: id,
          value: ledger,
        } as Command)
    }

    return commands
  },

  echo: (id, patch) => (budget) => {
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
  },

  create: async (budgetId, body) =>
    unwrap(
      await api.POST('/api/budgets/{budget_id}/non-staff-lines/', {
        params: { path: { budget_id: budgetId } },
        body,
      }),
    ),

  remove: async (budgetId, lineId) =>
    unwrap(
      await api.DELETE('/api/budgets/{budget_id}/non-staff-lines/{line_id}/', {
        params: { path: { budget_id: budgetId, line_id: lineId } },
      }),
    ),

  label: (row) =>
    row?.description?.trim() || row?.expense_type || 'A non-staff row',
}

export const LINE_KINDS: { [K in LineKind]: LineKindSpec<K> } = {
  staff,
  non_staff: nonStaff,
}
