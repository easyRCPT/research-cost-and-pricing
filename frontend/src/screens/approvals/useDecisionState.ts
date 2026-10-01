import { useState } from 'react'

import type { QueueRow } from '@/api/approvals'
import { useBudgetId } from '@/api/budget'
import { useDecidableStep } from '@/api/decidable'
import type { Decided } from '@/screens/approval-queue/DecisionPanel'

export function useDecisionState() {
  // An approver opens the costing itself from their queue, reads it through
  // the calculator's own screens, and decides here.
  const budgetId = useBudgetId()
  const live = useDecidableStep(budgetId)
  // Both held here, not in the panel: deciding takes the step out of the
  // queue the moment it refetches, and the decision only settles after that
  // refetch. Without the held row the panel would unmount first and never
  // hear its own outcome.
  const [held, setHeld] = useState<QueueRow | null>(null)
  if (live && live !== held) setHeld(live)
  const decidable = live ?? (held?.budget.id === budgetId ? held : undefined)
  const [decided, setDecided] = useState<Decided | null>(null)
  return { decidable, decided, setDecided }
}
