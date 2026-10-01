import { useBudgetId } from '@/api/budget/context'
import { useBudget } from '@/api/budget/detail'
import { useEdit } from '@/api/budget/write'
import { useLookups } from '@/api/lookups'

import { useDraftRows } from './draftRows'
import { LINE_KINDS, type LineKind, type Row } from './kinds'
import { useLineMutations } from './mutations'
import { coalesceKey, createOnce, type Lines } from './shared'

/** The staff or non-staff rows of the budget: saved ones, then the drafts. */
export function useLines<K extends LineKind>(
  kind: K,
  years: number[],
): Lines<Row<K>> {
  const spec = LINE_KINDS[kind]
  const budgetId = useBudgetId()
  const { data: budget } = useBudget()
  const { data: lookups } = useLookups()
  const edit = useEdit()
  const { create, remove } = useLineMutations(kind)

  const saved = spec.saved(budget)
  const rows = useDraftRows(kind, saved, years, spec.empty)

  return {
    lines: rows.lines,
    years,

    addLine: rows.addLine,

    removeLine: (id) => rows.removeLine(id, (lineId) => remove.mutate(lineId)),

    patchLine: (id, patch) => {
      if (rows.isDraft(id)) {
        const next = rows.patchDraft(id, patch)
        if (!next) return

        // The row stays in the draft layer until the reply lands. Dropping it
        // here meant a line the server refused -- over the time cap, a value
        // the serializer would not take -- was gone from both places at once:
        // removed from drafts, never saved, and the toast talking about a row
        // that was no longer on screen.
        const body = spec.toInput(next)
        if (body)
          createOnce(budgetId, id, () => create.mutate({ draftId: id, body }))
        return
      }

      const current = saved.find((row) => row.id === id)
      if (!current) return

      edit(
        spec.commands(id, current, patch, lookups),
        spec.echo(id, patch),
        coalesceKey(kind, id, patch),
      )
    },
  }
}
