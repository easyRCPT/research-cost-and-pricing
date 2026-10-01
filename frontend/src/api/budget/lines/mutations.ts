import { useMutation, useQueryClient } from '@tanstack/react-query'

import { useBudgetId } from '@/api/budget/context'
import { budgetKeys } from '@/api/budget/detail'
import { getDrafts, setDrafts } from '@/api/budget/drafts'
import { reportWriteError, writeKey, writeScope } from '@/api/budget/write'
import type { BudgetDetail } from '@/types'

import { LINE_KINDS, type LineInput, type LineKind } from './kinds'
import { creating, inFlight } from './shared'

/** The create and delete mutations for one kind of row. */
export function useLineMutations<K extends LineKind>(kind: K) {
  const spec = LINE_KINDS[kind]
  const budgetId = useBudgetId()
  const queryClient = useQueryClient()
  const key = budgetKeys.detail(budgetId)
  const scope = writeScope(budgetId)

  const onError = (error: unknown, where?: string) => {
    reportWriteError(error, where)
    queryClient.invalidateQueries({ queryKey: key })
  }

  const save = (detail: BudgetDetail) => queryClient.setQueryData(key, detail)

  const create = useMutation({
    mutationKey: writeKey,
    scope,
    mutationFn: ({ body }: { draftId: string; body: LineInput<K> }) =>
      spec.create(budgetId, body),
    // The draft goes only now, once the row exists on the server.
    onSuccess: (detail, { draftId }) => {
      creating.delete(inFlight(budgetId, draftId))
      const drafts = getDrafts(budgetId)
      setDrafts(budgetId, {
        ...drafts,
        [kind]: drafts[kind].filter((row) => row.id !== draftId),
      })
      save(detail)
    },
    // It stays put on a refusal, holding what was typed, so the row can be
    // corrected rather than disappearing as it is filled in.
    onError: (error, { draftId }) => {
      creating.delete(inFlight(budgetId, draftId))
      const row = getDrafts(budgetId)[kind].find((line) => line.id === draftId)
      onError(error, spec.label(row))
    },
  })

  const remove = useMutation({
    mutationKey: writeKey,
    scope,
    mutationFn: (lineId: string) => spec.remove(budgetId, lineId),
    onSuccess: save,
    // Wrapped: the mutation calls its handler with the line id, and the second
    // argument here is the row's name.
    onError: (error) => onError(error),
  })

  return { create, remove }
}
