import { useEffect } from 'react'

import { useBudgetId } from '@/api/budget/context'
import {
  type Drafts,
  getDrafts,
  setDrafts,
  useDrafts,
} from '@/api/budget/drafts'
import { STARTING_ROWS } from '@/lib/constants'

import { blankRows } from './shared'

type DraftSection = 'staff' | 'non_staff'
type DraftRow<K extends DraftSection> = Drafts[K][number]

const draftsOf = <K extends DraftSection>(budgetId: number, section: K) =>
  getDrafts(budgetId)[section] as DraftRow<K>[]

function ensureBlankRows<K extends DraftSection>(
  budgetId: number,
  section: K,
  years: number[],
  saved: number,
  emptyRow: (id: string, years: number[]) => DraftRow<K>,
) {
  const drafts = getDrafts(budgetId)
  if (drafts[section].length > 0) return
  const count = saved === 0 ? STARTING_ROWS : 1
  setDrafts(budgetId, {
    ...drafts,
    [section]: blankRows(count, emptyRow, years),
  })
}

/** Saved rows with the drafts that are not on the server yet behind them. */
export function useDraftRows<K extends DraftSection, S extends { id: string }>(
  section: K,
  saved: S[],
  years: number[],
  emptyRow: (id: string, years: number[]) => DraftRow<K>,
) {
  const budgetId = useBudgetId()
  const drafts = useDrafts()

  // A draft keeps its id once saved, so the server having it is what ends it.
  const savedIds = new Set(saved.map((line) => line.id))
  const isDraft = (id: string) => !savedIds.has(id)
  const lines = [
    ...saved,
    ...(drafts[section] as DraftRow<K>[]).filter((row) => isDraft(row.id)),
  ]

  const blanks = drafts[section].length
  useEffect(() => {
    if (blanks === 0)
      ensureBlankRows(budgetId, section, years, saved.length, emptyRow)
  }, [blanks, saved.length, budgetId, years, section, emptyRow])

  const writeDrafts = (rows: DraftRow<K>[]) =>
    setDrafts(budgetId, { ...getDrafts(budgetId), [section]: rows })

  return {
    lines,
    isDraft,

    addLine: () =>
      writeDrafts([
        ...draftsOf(budgetId, section),
        emptyRow(crypto.randomUUID(), years),
      ]),

    /** A draft goes locally; a saved row goes through `removeSaved`. */
    removeLine: (id: string, removeSaved: (id: string) => void) => {
      if (isDraft(id)) {
        writeDrafts(draftsOf(budgetId, section).filter((row) => row.id !== id))
        return
      }
      removeSaved(id)
    },

    /** Writes the patch into the draft and returns the row as it now reads. */
    patchDraft: (id: string, patch: Partial<DraftRow<K>>) => {
      const current = draftsOf(budgetId, section).find((row) => row.id === id)
      if (!current) return undefined
      const next: DraftRow<K> = { ...current, ...patch }

      writeDrafts(
        draftsOf(budgetId, section).map((row) => (row.id === id ? next : row)),
      )
      return next
    },
  }
}
