import { useState } from 'react'

import { useDebounced } from '@/lib/use-debounced'
import type { BudgetDetail, BudgetInfoInput, ProjectInfoInput } from '@/types'
import { useBudget } from './detail'
import { useCiFlag } from './ci-flag'
import { useEdit, type Command } from './write'

/** What the saved budget says, which is what every input binds to. */
export const useBudgetInfo = () => useBudget().data.budget_info

/**
 * What is typed, held locally until it settles, so a keystroke never
 * re-renders the screen it is typed on and never sends a request of its own.
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

const echoBudget =
  (field: string, value: unknown) =>
  (budget: BudgetDetail): BudgetDetail => ({
    ...budget,
    budget_info: { ...budget.budget_info, [field]: value },
  })

const echoProject =
  (patch: Partial<ProjectInfoInput>) =>
  (budget: BudgetDetail): BudgetDetail => ({
    ...budget,
    project_info: { ...budget.project_info, ...patch },
  })

/** One budget_info field, bound to an input. */
export function useField<K extends keyof BudgetInfoInput>(
  field: K,
  delay = 400,
) {
  const stored = useBudgetInfo()[field] as BudgetInfoInput[K]
  const setField = useSetBudgetField()

  return useDraft(
    stored,
    (value: BudgetInfoInput[K]) => setField(field, value),
    delay,
  )
}

/** budget_info fields with no input behind them, such as the submit button. */
export function useSetBudgetField() {
  const edit = useEdit()

  return <K extends keyof BudgetInfoInput>(
    field: K,
    value: BudgetInfoInput[K],
  ) =>
    edit(
      [{ section: 'budget', field, value } as Command],
      echoBudget(field, value),
    )
}

/** One project_info field, bound to an input. */
export function useProjectField<K extends keyof ProjectInfoInput>(
  field: K,
  delay = 400,
) {
  const stored = useBudget().data.project_info[field] as ProjectInfoInput[K]
  const update = useUpdateProject()

  return useDraft(
    stored,
    (value: ProjectInfoInput[K]) =>
      update({ [field]: value } as Partial<ProjectInfoInput>),
    delay,
  )
}

/**
 * project_info fields the API accepts. The rest of what a screen sends in a
 * patch — the faculty and cost centre that come with a department, the account
 * string built from them — are the server's to derive, and are echoed only so
 * the screen does not blink while the reply is in flight.
 */
const PROJECT_FIELDS = new Set<string>([
  'title',
  'chief_investigator',
  'funder',
  'other_funder',
  'other_funder_category',
  'scheme',
  'additional_information',
  'start_year',
  'start_month',
  'end_year',
  'end_month',
  'activity',
  'region',
])

export function useUpdateProject() {
  const edit = useEdit()

  return (patch: Partial<ProjectInfoInput>) => {
    const commands: Command[] = []

    for (const [field, value] of Object.entries(patch)) {
      if (PROJECT_FIELDS.has(field))
        commands.push({ section: 'project', field, value } as Command)
    }

    // A department arrives as its name, faculty and code together. The code is
    // the only part the API takes; the other two are what the reply will say.
    if (patch.cost_centre !== undefined)
      commands.push({
        section: 'project',
        field: 'department',
        value: patch.cost_centre,
      } as Command)

    edit(commands, echoProject(patch))
  }
}

/**
 * The CI cost toggle. Held next to the budget rather than in it, because the
 * engine does not take the flag yet and so there is no column for it.
 */
export function useCiCostsIncluded() {
  return useCiFlag()
}
