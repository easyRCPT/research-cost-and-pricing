import { useMutation, useQueryClient } from '@tanstack/react-query'

import { useBudgetId } from '@/api/budget/context'
import { budgetKey } from '@/api/budget/detail'
import { getDrafts, setDrafts } from '@/api/budget/drafts'
import { reportWriteError, writeKey, writeScope } from '@/api/budget/write'
import { api, unwrap } from '@/lib/api'
import type { BudgetDetail, NonStaffLineInput, StaffLineInput } from '@/types'

import { creating, inFlight } from './shared'

export function useLineMutations() {
  const budgetId = useBudgetId()
  const queryClient = useQueryClient()
  const key = budgetKey(budgetId)
  const scope = writeScope(budgetId)

  const onError = (error: unknown, where?: string) => {
    reportWriteError(error, where)
    queryClient.invalidateQueries({ queryKey: key })
  }

  const save = (detail: BudgetDetail) => queryClient.setQueryData(key, detail)

  /** Drops the draft the reply is for, then stores the budget that came back. */
  const settleDraft = (which: 'staff' | 'non_staff') => (draftId: string) => {
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
    mutationFn: async ({ body }: { draftId: string; body: StaffLineInput }) => {
      return unwrap(
        await api.POST('/api/budgets/{budget_id}/staff-lines/', {
          params: { path: { budget_id: budgetId } },
          body,
        }),
      )
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
      const row = getDrafts(budgetId).staff.find((line) => line.id === draftId)
      onError(error, row?.name_role?.trim() || 'A staff row')
    },
  })

  const deleteStaff = useMutation({
    mutationKey: writeKey,
    scope,
    mutationFn: async (lineId: string) => {
      return unwrap(
        await api.DELETE('/api/budgets/{budget_id}/staff-lines/{line_id}/', {
          params: { path: { budget_id: budgetId, line_id: lineId } },
        }),
      )
    },
    onSuccess: save,
    // Wrapped: the mutation calls its handler with the line id, and the second
    // argument here is the row's name.
    onError: (error) => onError(error),
  })

  const createNonStaff = useMutation({
    mutationKey: writeKey,
    scope,
    mutationFn: async ({
      body,
    }: {
      draftId: string
      body: NonStaffLineInput
    }) => {
      return unwrap(
        await api.POST('/api/budgets/{budget_id}/non-staff-lines/', {
          params: { path: { budget_id: budgetId } },
          body,
        }),
      )
    },
    onSuccess: (detail, { draftId }) => {
      settleDraft('non_staff')(draftId)
      save(detail)
    },
    onError: (error, { draftId }) => {
      creating.delete(inFlight(budgetId, draftId))
      const row = getDrafts(budgetId).non_staff.find(
        (line) => line.id === draftId,
      )
      onError(
        error,
        row?.description?.trim() || row?.expense_type || 'A non-staff row',
      )
    },
  })

  const deleteNonStaff = useMutation({
    mutationKey: writeKey,
    scope,
    mutationFn: async (lineId: string) => {
      return unwrap(
        await api.DELETE(
          '/api/budgets/{budget_id}/non-staff-lines/{line_id}/',
          {
            params: { path: { budget_id: budgetId, line_id: lineId } },
          },
        ),
      )
    },
    onSuccess: save,
    // Wrapped: the mutation calls its handler with the line id, and the second
    // argument here is the row's name.
    onError: (error) => onError(error),
  })

  return { createStaff, deleteStaff, createNonStaff, deleteNonStaff }
}
