import {
  queryOptions,
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query'
import { api, ApiError } from '@/lib/api'
import { projectsQuery } from '@/api/projects'
import type { components } from '@/types/api'

export type QueueRow = components['schemas']['ApprovalQueue']
export type Decision = 'approve' | 'reject'

export const queueQuery = queryOptions({
  queryKey: ['approvals', 'queue'] as const,
  queryFn: async (): Promise<QueueRow[]> => {
    const { data, error, response } = await api.GET('/api/approvals/queue/')
    if (error) throw new ApiError(response.status, error)
    return data
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
  const queryClient = useQueryClient()

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
      const { data, error, response } = await api.POST(
        '/api/approvals/{step_id}/decide/',
        {
          params: { path: { step_id: stepId } },
          body: { decision, comment },
        },
      )
      if (error) throw new ApiError(response.status, error)
      return data.budget_status
    },
    // Returned, not fired and forgotten: the mutation stays pending until the
    // queue has refetched, so "you approved it" never shows beside a list that
    // still offers it.
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queueQuery.queryKey }),
        queryClient.invalidateQueries({ queryKey: projectsQuery.queryKey }),
        // Any open copy of the budget now has a new status and a new step.
        queryClient.invalidateQueries({ queryKey: ['budget'] }),
      ]),
  })
}
