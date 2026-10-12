import { useBudget } from '@/api/budget'

import { CayuseSummaryPanel } from './price-summary/CayuseSummaryPanel'
import { PriceBreakdownPanel } from './price-summary/PriceBreakdownPanel'

export function PriceSummary() {
  const { data: budget } = useBudget()

  const summary = budget.budget_summary.price_summary
  // Use the rate on the current draft or the version frozen on submission.
  const multiplier = budget.budget_info.cost_multiplier

  return (
    <>
      <PriceBreakdownPanel
        summary={summary}
        inAud={budget.budget_summary.in_aud.price_summary}
        info={budget.budget_info}
      />
      <CayuseSummaryPanel multiplier={multiplier} />
    </>
  )
}
