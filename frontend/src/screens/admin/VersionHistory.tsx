import { useSearch } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'

import { PageHead } from '@/components/shell'
import { RatesMovedNotice } from '@/screens/admin/rates/RatesMovedNotice'
import type { RatesMoved, Shown } from '@/screens/admin/versions/types'
import { VersionsPanel } from '@/screens/admin/versions/VersionsPanel'

/** Every set of rates the tool has had, and a way to put one back (#137, #138). */
export function VersionHistory() {
  // A save on the lookup tables links here to who was priced on what it replaced.
  const { version } = useSearch({ from: '/admin/versions' })
  const [shown, setShown] = useState<Shown | null>(
    version === undefined ? null : { id: version, tab: 'costings' },
  )
  const [moved, setMoved] = useState<RatesMoved | null>(null)

  return (
    <>
      <PageHead
        title="Lookup history"
        subtitle="A version is the rates some costing was priced on. Saved changes go into the current version until a costing is submitted on it; the next save then starts a new one."
      />

      {moved && (
        <RatesMovedNotice
          moved={moved}
          onSee={(versionId) => setShown({ id: versionId, tab: 'costings' })}
          onDismiss={() => setMoved(null)}
        />
      )}

      <VersionsPanel
        shown={shown}
        onShow={setShown}
        onRestored={(restored) => {
          setMoved(restored)
          toast.success(restored.title, { description: restored.description })
        }}
      />
    </>
  )
}
