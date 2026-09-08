import { useBudget, useField } from '@/api/budget'
import type { LookupTables } from '@/types'
import { CayuseSummaryPanel } from './price-summary/CayuseSummaryPanel'
import { PriceBreakdownPanel } from './price-summary/PriceBreakdownPanel'
import { UniversityPositionPanel } from './price-summary/UniversityPositionPanel'

const fullRecoveryBasis = (lookups: LookupTables) =>
  lookups.calculation_constants.find(
    (constant) => constant.name === 'full_cost_recovery_multiplier',
  )?.value

export interface PriceSummaryProps {
  lookups: LookupTables
}

export function PriceSummary({ lookups }: PriceSummaryProps) {
  const { data: budget } = useBudget()
  const cash = useField('cash_co_contribution')

  const summary = budget.budget_summary.price_summary
  const multiplier = budget.budget_info.cost_multiplier

  return (
    <>
      <CayuseSummaryPanel summary={summary} multiplier={multiplier} />
      <PriceBreakdownPanel
        summary={summary}
        multiplier={multiplier}
        basis={fullRecoveryBasis(lookups)}
      />
      <UniversityPositionPanel summary={summary} cash={cash} />
    </>
  )
}
