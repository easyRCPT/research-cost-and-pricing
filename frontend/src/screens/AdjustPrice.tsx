import type { NonStaffLines } from '@/api/budget'
import { CashCoContributionPanel } from './adjust-price/CashCoContributionPanel'
import { InKindPanel } from './adjust-price/InKindPanel'
import { MarginPanel } from './adjust-price/MarginPanel'

export interface AdjustPriceProps {
  nonStaff: NonStaffLines
}

export function AdjustPrice({ nonStaff }: AdjustPriceProps) {
  return (
    <>
      <InKindPanel nonStaff={nonStaff} />
      <MarginPanel />
      <CashCoContributionPanel />
    </>
  )
}
