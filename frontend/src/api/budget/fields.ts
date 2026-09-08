import { useState } from 'react'

import { useBudgetInput } from '@/lib/budget-store'
import type { BudgetInfoInput, ProjectInfoInput } from '@/types'
import { useDebounced } from '@/lib/use-debounced'
import { useCommit } from './commit'

/** What was typed, ahead of the engine's echo. Inputs fall back to this, not the cache. */
export const useBudgetInfo = () => useBudgetInput().budget_info

/**
 * What is typed, held locally until it settles, so a keystroke never
 * re-renders the screen it is typed on.
 */
function useDraft<T>(stored: T, save: (value: T) => void, delay: number) {
  const [draft, setDraft] = useState<T | null>(null)

  const flush = useDebounced((value: T) => {
    setDraft(null)
    save(value)
  }, delay)

  return {
    value: draft ?? stored,
    onChange: (value: T) => {
      setDraft(value)
      flush(value)
    },
  }
}

/** One budget_info field, bound to an input. */
export function useField<K extends keyof BudgetInfoInput>(
  field: K,
  delay = 400,
) {
  const stored = useBudgetInfo()[field]
  const commit = useCommit()

  return useDraft(
    stored,
    (value: BudgetInfoInput[K]) =>
      commit((budget) => ({
        ...budget,
        budget_info: { ...budget.budget_info, [field]: value },
      })),
    delay,
  )
}

/** One project_info field, bound to an input. */
export function useProjectField<K extends keyof ProjectInfoInput>(
  field: K,
  delay = 400,
) {
  const stored = useBudgetInput().project_info[field]
  const commit = useCommit()

  return useDraft(
    stored,
    (value: ProjectInfoInput[K]) =>
      commit((budget) => ({
        ...budget,
        project_info: { ...budget.project_info, [field]: value },
      })),
    delay,
  )
}

/** budget_info fields with no input behind them, such as the submit button. */
export function useSetBudgetField() {
  const commit = useCommit()
  return <K extends keyof BudgetInfoInput>(
    field: K,
    value: BudgetInfoInput[K],
  ) =>
    commit((budget) => ({
      ...budget,
      budget_info: { ...budget.budget_info, [field]: value },
    }))
}

/**
 * The CI cost toggle. Held next to the budget rather than inside budget_info,
 * because the engine does not take the flag yet.
 */
export function useCiCostsIncluded() {
  const included = useBudgetInput().ci_costs_included
  const commit = useCommit()

  return {
    included,
    setIncluded: (value: boolean) =>
      commit((budget) => ({ ...budget, ci_costs_included: value })),
  }
}

export function useUpdateProject() {
  const commit = useCommit()
  return (patch: Partial<ProjectInfoInput>) =>
    commit((budget) => ({
      ...budget,
      project_info: { ...budget.project_info, ...patch },
    }))
}
