import { CashCoContributionPanel } from './adjust-price/CashCoContributionPanel'
import { InKindPanel } from './adjust-price/InKindPanel'
import { MarginPanel } from './adjust-price/MarginPanel'

export function AdjustPrice() {
  return (
    <>
      <InKindPanel />
      <MarginPanel />
      <CashCoContributionPanel />
    </>
  )
}
