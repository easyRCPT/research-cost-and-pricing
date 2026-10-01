import { useState } from 'react'
import { toast } from 'sonner'

import type { ChangesApplied, RateTable } from '@/api/admin-lookups'
import { ApiError } from '@/lib/api'
import { asPercent } from '@/lib/format/constants'
import type { Refused } from '@/screens/admin/rates/types'
import { idOf, refusedChange, type Staged } from '@/screens/admin/stagedChanges'
import type { RatesMoved } from '@/screens/admin/versions/types'
import type { LookupTables } from '@/types'

export function useStagedChanges(
  lookups: LookupTables,
  onShowTable: (table: RateTable) => void,
) {
  const [staged, setStaged] = useState<Staged[]>([])
  const [refused, setRefused] = useState<Refused>(null)
  const [reviewing, setReviewing] = useState(false)
  const [moved, setMoved] = useState<RatesMoved | null>(null)

  // A constant's value once the staged set is saved: what is staged for it,
  // or what it is now.
  const constantAfter = (name: string) => {
    const change = staged.find(
      (candidate) =>
        candidate.table === 'calculation_constants' &&
        candidate.key.name === name,
    )
    if (change?.op === 'update' && 'value' in change.value)
      return Number(change.value.value)
    return Number(
      lookups.calculation_constants.find((row) => row.name === name)?.value,
    )
  }
  // A warning, not a refusal: it may be what policy wants (#151).
  const warnings =
    constantAfter('minimum_margin') > constantAfter('default_margin')
      ? [
          `The minimum margin (${asPercent(constantAfter('minimum_margin'))}) will be above the default margin (${asPercent(constantAfter('default_margin'))}), so every new costing will start out needing the Dean.`,
        ]
      : []

  // Every staged change is the set's, so any edit may clear the refusal.
  const stage = (next: Staged[]) => {
    setStaged(next)
    setRefused(null)
    if (next.length === 0) setReviewing(false)
  }

  const onSaved = (saved: ChangesApplied, count: number) => {
    const done = {
      title: `${count} ${count === 1 ? 'change' : 'changes'} saved`,
      description: saved.new_version
        ? `They started version #${saved.version_id}.`
        : `They went into version #${saved.version_id}.`,
      replaced: saved.replaced,
    }
    setStaged([])
    setReviewing(false)
    setMoved(done)
    toast.success(done.title, { description: done.description })
  }

  const onRefused = (error: unknown) => {
    const which = refusedChange(error, staged)
    setRefused(which)
    setReviewing(false)
    if (which)
      onShowTable(staged.find((change) => idOf(change) === which.id)!.table)
    toast.error('Nothing was saved', {
      description: error instanceof ApiError ? error.message : 'Try again.',
    })
  }

  return {
    staged,
    refused,
    reviewing,
    setReviewing,
    moved,
    setMoved,
    warnings,
    stage,
    onSaved,
    onRefused,
  }
}
