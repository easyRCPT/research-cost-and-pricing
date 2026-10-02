import {
  queryOptions,
  useMutation,
  useSuspenseQuery,
} from '@tanstack/react-query'

import { budgetKeys } from '@/api/budget/detail'
import { projectKeys } from '@/api/projects'
import { useInvalidate } from '@/api/query'
import { api, unwrap } from '@/lib/api'
import type { components } from '@/types/api'

export type QueueRow = components['schemas']['ApprovalQueue']
export type Decision = 'approve' | 'reject'

export const queueQuery = queryOptions({
  queryKey: ['approvals', 'queue'] as const,
  queryFn: async () => {
    return unwrap(await api.GET('/api/approvals/queue/'))
  },
  // A queue is other people's work arriving, so it is worth asking again
  // rather than holding the five-minute default the editor uses.
  staleTime: 15_000,
})

/** What is waiting on this account, right now (#79). */
export function useApprovalQueue() {
  return useSuspenseQuery(queueQuery)
}

/**
 * Approve or reject one step.
 *
 * The reply names where the budget went -- dean_review, approved, rejected --
 * so the outcome shown is the server's, not a guess. The queue is refetched
 * either way: on success the row has gone, and on a 409 somebody else decided
 * first and the row is stale.
 */
export function useDecide() {
  const invalidate = useInvalidate()

  return useMutation({
    mutationFn: async ({
      stepId,
      decision,
      comment,
    }: {
      stepId: number
      decision: Decision
      comment: string
    }) => {
      return unwrap(
        await api.POST('/api/approvals/{step_id}/decide/', {
          params: { path: { step_id: stepId } },
          body: { decision, comment },
        }),
      ).budget_status
    },
    // Returned, not fired and forgotten: the mutation stays pending until the
    // queue has refetched, so "you approved it" never shows beside a list that
    // still offers it.
    // Any open copy of the budget now has a new status and a new step.
    onSettled: () =>
      invalidate(queueQuery.queryKey, projectKeys.all, budgetKeys.all),
  })
}
