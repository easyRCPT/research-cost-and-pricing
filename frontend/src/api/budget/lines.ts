import { useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { useLookups } from '@/api/lookups'
import { api, ApiError } from '@/lib/api'
import { STARTING_ROWS } from '@/lib/constants'
import { emptyNonStaffLine } from '@/lib/non-staff'
import { emptyStaffLine, isRated } from '@/lib/staff'
import type {
  BudgetDetail,
  NonStaffLine,
  NonStaffLineInput,
  StaffLine,
  StaffLineInput,
} from '@/types'
import { useBudgetId } from './context'
import { budgetKey } from './detail'
import { getDrafts, isDraft, setDrafts, useDrafts } from './drafts'
import { nextTempId } from '@/lib/utils'
import { useBudget } from './detail'
import {
  reportWriteError,
  useEdit,
  writeKey,
  writeScope,
  type Command,
} from './write'

export interface Lines<T> {
  lines: T[]
  years: number[]
  patchLine: (id: number, patch: Partial<T>) => void
  addLine: () => void
  removeLine: (id: number) => void
}

export type StaffLines = Lines<StaffLine>
export type NonStaffLines = Lines<NonStaffLine>

/** Fields of a staff row the API takes one at a time. */
const STAFF_FIELDS = new Set<string>([
  'name_role',
  'classification',
  'employment_type',
  'category',
  'time_basis',
  'in_kind',
])

const NON_STAFF_FIELDS = new Set<string>([
  'description',
  'in_kind',
  'add_ten_percent',
  'indirect_rate_multiplier',
])

const byId = (a: { id: number }, b: { id: number }) => a.id - b.id

/**
 * Names the field a burst of edits is landing on, so the writes coalesce.
 *
 * Only for a patch that moves one field: that is the shape typing produces.
 * A patch that moves several is a choice that cascaded -- picking an
 * employment type that invalidates the time basis -- and is sent at once,
 * since a later edit to a different field must not replace it.
 */
function coalesceKey(
  section: string,
  id: number,
  patch: object,
): string | undefined {
  const fields = Object.keys(patch)
  return fields.length === 1 ? `${section}:${id}:${fields[0]}` : undefined
}

// ------------------------------------------------------------------
// Saving and removing whole rows
// ------------------------------------------------------------------

/**
 * Draft rows with a create already in flight.
 *
 * A draft stays on screen until the server has it, so the next keystroke finds
 * it still there and would post it a second time. One create per draft row.
 */
const creating = new Set<string>()
const inFlight = (budgetId: number, draftId: number) => `${budgetId}:${draftId}`

function useLineMutations() {
  const budgetId = useBudgetId()
  const queryClient = useQueryClient()
  const key = budgetKey(budgetId)
  const scope = writeScope(budgetId)

  const onError = (error: unknown) => {
    reportWriteError(error)
    queryClient.invalidateQueries({ queryKey: key })
  }

  const save = (detail: BudgetDetail) => queryClient.setQueryData(key, detail)

  /** Drops the draft the reply is for, then stores the budget that came back. */
  const settleDraft = (which: 'staff' | 'non_staff') => (draftId: number) => {
    creating.delete(inFlight(budgetId, draftId))
    const drafts = getDrafts(budgetId)
    setDrafts(budgetId, {
      ...drafts,
      [which]: drafts[which].filter((row) => row.id !== draftId),
    })
  }

  const createStaff = useMutation({
    mutationKey: writeKey,
    scope,
    mutationFn: async ({ body }: { draftId: number; body: StaffLineInput }) => {
      const { data, error, response } = await api.POST(
        '/api/budgets/{budget_id}/staff-lines/',
        { params: { path: { budget_id: budgetId } }, body },
      )
      if (error) throw new ApiError(response.status, error)
      return data
    },
    // The draft goes only now, once the row exists on the server.
    onSuccess: (detail, { draftId }) => {
      settleDraft('staff')(draftId)
      save(detail)
    },
    // It stays put on a refusal, holding what was typed, so the row can be
    // corrected rather than disappearing as it is filled in.
    onError: (error, { draftId }) => {
      creating.delete(inFlight(budgetId, draftId))
      onError(error)
    },
  })

  const deleteStaff = useMutation({
    mutationKey: writeKey,
    scope,
    mutationFn: async (lineId: number) => {
      const { data, error, response } = await api.DELETE(
        '/api/budgets/{budget_id}/staff-lines/{line_id}/',
        {
          params: { path: { budget_id: budgetId, line_id: lineId } },
        },
      )
      if (error) throw new ApiError(response.status, error)
      return data
    },
    onSuccess: save,
    onError,
  })

  const createNonStaff = useMutation({
    mutationKey: writeKey,
    scope,
    mutationFn: async ({
      body,
    }: {
      draftId: number
      body: NonStaffLineInput
    }) => {
      const { data, error, response } = await api.POST(
        '/api/budgets/{budget_id}/non-staff-lines/',
        { params: { path: { budget_id: budgetId } }, body },
      )
      if (error) throw new ApiError(response.status, error)
      return data
    },
    onSuccess: (detail, { draftId }) => {
      settleDraft('non_staff')(draftId)
      save(detail)
    },
    onError: (error, { draftId }) => {
      creating.delete(inFlight(budgetId, draftId))
      onError(error)
    },
  })

  const deleteNonStaff = useMutation({
    mutationKey: writeKey,
    scope,
    mutationFn: async (lineId: number) => {
      const { data, error, response } = await api.DELETE(
        '/api/budgets/{budget_id}/non-staff-lines/{line_id}/',
        {
          params: { path: { budget_id: budgetId, line_id: lineId } },
        },
      )
      if (error) throw new ApiError(response.status, error)
      return data
    },
    onSuccess: save,
    onError,
  })

  return { createStaff, deleteStaff, createNonStaff, deleteNonStaff }
}

// ------------------------------------------------------------------
// Staff
// ------------------------------------------------------------------

const toStaffInput = (line: StaffLine): StaffLineInput => ({
  name_role: line.name_role,
  employment_type: line.employment_type as StaffLineInput['employment_type'],
  category: line.category as StaffLineInput['category'],
  classification: line.classification,
  time_basis: line.time_basis as StaffLineInput['time_basis'],
  in_kind: line.in_kind,
  allocations: line.by_year
    .filter((entry) => entry.time > 0)
    .map(({ year, time }) => ({ year, time })),
})

/** The row as it is shown, patched in place wherever the reply put it. */
const echoStaffLine =
  (id: number, patch: Partial<StaffLine>) =>
  (budget: BudgetDetail): BudgetDetail => {
    const apply = (lines: StaffLine[]) =>
      lines.map((line) => (line.id === id ? { ...line, ...patch } : line))

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

/**
 * Blank rows to type into.
 *
 * The grid is filled in by typing across a blank row, so there has to be one
 * waiting. An empty budget opens with a screenful of them, the way the
 * browser-held budget used to; after that a single trailing blank keeps the
 * next row always ready, and the Add button is there for more at once.
 *
 * They are drafts, not saved rows: the model will not store a staff line with
 * no classification, so a row moves to the server once it is complete.
 */
function blankRows<T>(
  count: number,
  empty: (id: number, years: number[]) => T,
  years: number[],
) {
  return Array.from({ length: count }, (_, index) => empty(-(index + 1), years))
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

export function useStaffLines(years: number[]): StaffLines {
  const budgetId = useBudgetId()
  const { data: budget } = useBudget()
  const drafts = useDrafts()
  const edit = useEdit()
  const { createStaff, deleteStaff } = useLineMutations()

  const saved = [
    ...budget.staff_cost.lines,
    ...budget.staff_in_kind_cost.lines,
  ].sort(byId)

  const lines = [...saved, ...drafts.staff]

  const blanks = drafts.staff.length
  useEffect(() => {
    if (blanks === 0) ensureBlankStaffRows(budgetId, years, saved.length)
  }, [blanks, saved.length, budgetId, years])

  const writeDrafts = (rows: StaffLine[]) =>
    setDrafts(budgetId, { ...getDrafts(budgetId), staff: rows })

  return {
    lines,
    years,

    addLine: () =>
      writeDrafts([
        ...getDrafts(budgetId).staff,
        emptyStaffLine(nextTempId(lines), years),
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
            getDrafts(budgetId).staff.map((row) => (row.id === id ? next : row)),
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

// ------------------------------------------------------------------
// Non-staff
// ------------------------------------------------------------------

const isCosted = (line: NonStaffLine) =>
  line.cost_group !== '' && line.expense_type !== ''

const toNonStaffInput = (line: NonStaffLine): NonStaffLineInput => ({
  cost_group: line.cost_group,
  expense_type: line.expense_type,
  description: line.description,
  in_kind: line.in_kind,
  add_ten_percent: line.add_ten_percent,
  indirect_rate_multiplier: line.indirect_rate_multiplier,
  amounts: line.by_year
    .filter((entry) => entry.amount > 0)
    .map(({ year, amount }) => ({ year, amount })),
})

const echoNonStaffLine =
  (id: number, patch: Partial<NonStaffLine>) =>
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
  const drafts = useDrafts()
  const edit = useEdit()
  const { createNonStaff, deleteNonStaff } = useLineMutations()

  const saved = [
    ...budget.non_staff_cost.lines,
    ...budget.non_staff_in_kind_cost.lines,
  ].sort(byId)

  const lines = [...saved, ...drafts.non_staff]

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
        emptyNonStaffLine(nextTempId(lines), years),
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
