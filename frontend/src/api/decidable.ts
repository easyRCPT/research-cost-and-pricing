import { useQuery } from '@tanstack/react-query'

import { queueQuery, type QueueRow } from '@/api/approvals'
import { isApprover, useMe } from '@/api/auth'

/**
 * The step on this budget that the signed-in account may decide now, if any.
 *
 * Read off the queue, which is exactly "the steps this caller may decide right
 * now" (#79), so the costing's own screens never work out who may approve --
 * that rule lives in one place, on the server. Only asked for by an approver:
 * nobody else has a queue.
 */
export function useDecidableStep(budgetId: number): QueueRow | undefined {
  const { data: me } = useMe()
  const { data: queue } = useQuery({ ...queueQuery, enabled: !!me && isApprover(me) })
  return queue?.find((row) => row.budget.id === budgetId)
}
