import { useBudget } from '@/api/budget'

import { CayuseSummaryPanel } from './price-summary/CayuseSummaryPanel'
import { PriceBreakdownPanel } from './price-summary/PriceBreakdownPanel'
import { UniversityPositionPanel } from './price-summary/UniversityPositionPanel'

export function PriceSummary() {
  const { data: budget } = useBudget()

  const summary = budget.budget_summary.price_summary
  // The full cost recovery rate the costing is priced at: the current one for
  // a draft, the one it was stamped with once submitted (#149).
  const multiplier = budget.budget_info.cost_multiplier

  return (
    <>
      <CayuseSummaryPanel summary={summary} multiplier={multiplier} />
      <PriceBreakdownPanel
        summary={summary}
        multiplier={multiplier}
        basis={multiplier}
      />
      <UniversityPositionPanel summary={summary} />
    </>
  )
}
