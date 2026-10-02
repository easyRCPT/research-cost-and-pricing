import type { ReactNode } from 'react'

import { BudgetIdContext } from './context'

export function BudgetProvider({
  budgetId,
  children,
}: {
  budgetId: number
  children: ReactNode
}) {
  return <BudgetIdContext value={budgetId}>{children}</BudgetIdContext>
}
