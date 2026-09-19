import { useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { useLookups } from '@/api/lookups'
import { api, ApiError } from '@/lib/api'
import {
  emptyDeliverable,
  isComplete,
  nextNumber,
  toDeliverableInput,
  typeCode,
} from '@/lib/deliverables'
import type { BudgetDetail, Deliverable } from '@/types'
import { useBudgetId } from './context'
import { budgetKey, useBudget } from './detail'
import { getDrafts, isDraft, setDrafts, useDrafts } from './drafts'
import { nextTempId } from '@/lib/utils'
import {
  reportWriteError,
  useEdit,
  writeKey,
  writeScope,
  type Command,
} from './write'

export interface Deliverables {
  rows: Deliverable[]
  patchRow: (id: number, patch: Partial<Deliverable>) => void
  addRow: () => void
  removeRow: (id: number) => void
}

/** Fields the API takes one at a time, under their own names. */
const FIELDS = new Set<string>([
  'number',
  'description',
  'due_date',
  'dependency',
  'sponsor',
  'invoice_amount',
])

/** The row as it is shown, patched in place until the reply lands. */
const echoDeliverable =
  (id: number, patch: Partial<Deliverable>) =>
  (budget: BudgetDetail): BudgetDetail => ({
    ...budget,
    budget_info: {
      ...budget.budget_info,
      deliverables: budget.budget_info.deliverables.map((row) =>
        row.id === id ? { ...row, ...patch } : row,
      ),
    },
  })

export function useDeliverables(): Deliverables {
  const budgetId = useBudgetId()
  const { data: budget } = useBudget()
  const { data: lookups } = useLookups()
  const drafts = useDrafts()
  const edit = useEdit()
  const queryClient = useQueryClient()

  const key = budgetKey(budgetId)
  const scope = writeScope(budgetId)

  const onError = (error: unknown, where?: string) => {
    reportWriteError(error, where)
    queryClient.invalidateQueries({ queryKey: key })
  }

  const save = (detail: BudgetDetail) => queryClient.setQueryData(key, detail)

  const createRow = useMutation({
    mutationKey: writeKey,
    scope,
    mutationFn: async (row: Deliverable) => {
      const code = typeCode(lookups, row.deliverable_type)
      if (code === undefined) throw new Error('Unknown deliverable type')

      const { data, error, response } = await api.POST(
        '/api/budgets/{budget_id}/deliverables/',
        {
          params: { path: { budget_id: budgetId } },
          body: toDeliverableInput(row, code),
        },
      )
      if (error) throw new ApiError(response.status, error)
      return data
    },
    onSuccess: save,
    onError: (error, row) =>
      onError(error, row.description.trim() || `Deliverable ${row.number}`),
  })

  const deleteRow = useMutation({
    mutationKey: writeKey,
    scope,
    mutationFn: async (deliverableId: number) => {
      const { data, error, response } = await api.DELETE(
        '/api/budgets/{budget_id}/deliverables/{deliverable_id}/',
        {
          params: {
            path: { budget_id: budgetId, deliverable_id: deliverableId },
          },
        },
      )
      if (error) throw new ApiError(response.status, error)
      return data
    },
    onSuccess: save,
    // Wrapped: the mutation calls its handler with the line id, and the second
    // argument here is the row's name.
    onError: (error) => onError(error),
  })

  const saved = budget.budget_info.deliverables
  const rows = [...saved, ...drafts.deliverable]

  // A blank row is always waiting, so the table is filled in by typing across
  // it rather than by pressing Add first.
  const blanks = drafts.deliverable.length
  useEffect(() => {
    if (blanks > 0) return
    const current = getDrafts(budgetId)
    setDrafts(budgetId, {
      ...current,
      deliverable: [emptyDeliverable(-1, nextNumber(saved))],
    })
  }, [blanks, budgetId, saved])

  const writeDrafts = (next: Deliverable[]) =>
    setDrafts(budgetId, { ...getDrafts(budgetId), deliverable: next })

  return {
    rows,

    addRow: () =>
      writeDrafts([
        ...getDrafts(budgetId).deliverable,
        emptyDeliverable(nextTempId(rows), nextNumber(rows)),
      ]),

    removeRow: (id) => {
      if (isDraft(id)) {
        writeDrafts(
          getDrafts(budgetId).deliverable.filter((row) => row.id !== id),
        )
        return
      }
      deleteRow.mutate(id)
    },

    patchRow: (id, patch) => {
      if (isDraft(id)) {
        const current = getDrafts(budgetId).deliverable.find(
          (row) => row.id === id,
        )
        if (!current) return
        const next = { ...current, ...patch }

        // Complete enough for the model to hold it, so it stops being a draft.
        if (isComplete(next)) {
          writeDrafts(
            getDrafts(budgetId).deliverable.filter((row) => row.id !== id),
          )
          createRow.mutate({ ...next, number: nextNumber(saved) })
          return
        }

        writeDrafts(
          getDrafts(budgetId).deliverable.map((row) =>
            row.id === id ? next : row,
          ),
        )
        return
      }

      const commands: Command[] = []

      for (const [field, value] of Object.entries(patch)) {
        if (field === 'deliverable_type') {
          // The column shows names; the API is keyed on the code.
          const code = typeCode(lookups, String(value))
          if (code === undefined) continue
          commands.push({
            section: 'deliverable',
            field: 'deliverable_type',
            row_id: id,
            value: code,
          })
          continue
        }

        if (FIELDS.has(field)) {
          commands.push({
            section: 'deliverable',
            field: field as 'description',
            row_id: id,
            value: value as string,
          })
        }
      }

      const fields = Object.keys(patch)
      edit(
        commands,
        echoDeliverable(id, patch),
        fields.length === 1 ? `deliverable:${id}:${fields[0]}` : undefined,
      )
    },
  }
}
