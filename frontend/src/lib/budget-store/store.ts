import { useSyncExternalStore } from 'react'

import type { CalculationConstant } from '@/types'
import { type BudgetInput, initialBudget } from './budget-input'

let budget = initialBudget()
let multipliersSeeded = false

const listeners = new Set<() => void>()

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export const getBudgetInput = () => budget

export function setBudgetInput(next: BudgetInput) {
  budget = next
  for (const listener of listeners) listener()
}

export const useBudgetInput = () =>
  useSyncExternalStore(subscribe, getBudgetInput)

/** Takes the default multipliers off the lookups, once, before the first calculate. */
export function seedMultipliers(constants: readonly CalculationConstant[]) {
  if (multipliersSeeded) return
  multipliersSeeded = true

  const valueOf = (name: string) =>
    constants.find((constant) => constant.name === name)?.value

  const cost = valueOf('full_cost_recovery_multiplier')
  const inKind = valueOf('in_kind_multiplier')

  budget = {
    ...budget,
    budget_info: {
      ...budget.budget_info,
      cost_multiplier: cost ?? budget.budget_info.cost_multiplier,
      in_kind_multiplier: inKind ?? budget.budget_info.in_kind_multiplier,
    },
  }
}

/**
 * Applies an edit to the browser copy of the budget. Every edit goes through
 * here, so there is one place for persistence to land.
 */
export function savePatch(change: (budget: BudgetInput) => BudgetInput) {
  const next = change(budget)
  setBudgetInput(next)
  // TODO: uncomment when auth lands. Persistence is the only thing missing.
  // api.PATCH('/api/budgets/{id}/', { body: next })
  return next
}
