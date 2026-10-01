import { useBlocker } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'

import { useApproverGaps } from '@/api/admin-console'
import type { RateTable } from '@/api/admin-lookups'
import { useLookups } from '@/api/lookups'
import { PageHead } from '@/components/shell'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { gapFlags } from '@/screens/admin/lookups/gapFlags'
import { LeaveGuard } from '@/screens/admin/lookups/LeaveGuard'
import { LookupTabs } from '@/screens/admin/lookups/LookupTabs'
import { RateTablePanel } from '@/screens/admin/lookups/RateTablePanel'
import { useStagedChanges } from '@/screens/admin/lookups/useStagedChanges'
import { ChangeBar } from '@/screens/admin/rates/ChangeBar'
import { RatesMovedNotice } from '@/screens/admin/rates/RatesMovedNotice'
import { Review } from '@/screens/admin/rates/Review'
import { isRateTable,RATE_TABLES } from '@/screens/admin/rateTables'
import { ReferenceTableEditor } from '@/screens/admin/reference/ReferenceTableEditor'
import {
  referenceSpec,
  type ReferenceTable,
} from '@/screens/admin/referenceTables'
import type { Row } from '@/screens/admin/stagedChanges'
import { VersionsPanel } from '@/screens/admin/versions/VersionsPanel'

/**
 * Everything an administrator maintains in the workbook's lookup sheets, in
 * two kinds (#138, #70, #144).
 *
 * The rates price a costing, so they are edited as one reviewed set: edits
 * are held on screen, across every rate tab, until they are reviewed and
 * saved in one request, which the server applies all at once or not at all.
 * Saving a row at a time, a costing submitted while an administrator was
 * partway through a many-row change was frozen onto half of it for good. A
 * set goes into the current version until a costing is submitted on it; the
 * first set after that starts a new version, so a submitted costing keeps the
 * rates it was submitted with, and any older set can be put back (#137).
 *
 * The reference tables (faculties, departments, the lists a project picks
 * from) don't price anything, so each row is saved on its own and changed in
 * place, with no version.
 */
export function LookupEditor() {
  const { data: lookups } = useLookups()
  // Which units have nobody to sign for them, flagged on their tabs (#121).
  const gaps = useApproverGaps()
  const [tableId, setTableId] = useState<RateTable | ReferenceTable>(
    RATE_TABLES[0].id,
  )
  const [shownVersion, setShownVersion] = useState<number | null>(null)
  const {
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
  } = useStagedChanges(lookups, setTableId)

  const rowsOf = (id: RateTable | ReferenceTable) =>
    (lookups[id] ?? []) as unknown as Row[]

  const blocker = useBlocker({
    shouldBlockFn: () => true,
    disabled: staged.length === 0,
    enableBeforeUnload: () => staged.length > 0,
    withResolver: true,
  })

  const seeVersion = (versionId: number) => {
    setShownVersion(versionId)
    requestAnimationFrame(() =>
      document
        .getElementById(`version-${versionId}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
    )
  }

  return (
    <>
      <PageHead
        title="Lookup tables"
        subtitle="The rates every costing is priced with, and the lists it is built from"
      />

      {moved ? (
        <RatesMovedNotice
          moved={moved}
          onSee={seeVersion}
          onDismiss={() => setMoved(null)}
        />
      ) : (
        <Alert className="mb-4">
          <AlertDescription>
            Rate changes are held here until you review and save them, and then
            apply all at once. Saved changes reprice every draft and every new
            costing straight away. Costings already submitted keep the rates
            they were submitted with, and any earlier set of rates can be put
            back below. Reference tables are saved a row at a time.
          </AlertDescription>
        </Alert>
      )}

      <LookupTabs tableId={tableId} onChange={setTableId} staged={staged} />

      {isRateTable(tableId) ? (
        <RateTablePanel
          tableId={tableId}
          lookups={lookups}
          rows={rowsOf(tableId)}
          staged={staged}
          refused={refused}
          onStage={stage}
        />
      ) : (
        <ReferenceTableEditor
          spec={referenceSpec(tableId)}
          rows={rowsOf(tableId)}
          faculties={lookups.faculties}
          flags={gapFlags(tableId, gaps.data)}
        />
      )}

      {staged.length > 0 &&
        (reviewing ? (
          <Review
            staged={staged}
            warnings={warnings}
            onBack={() => setReviewing(false)}
            onSaved={onSaved}
            onRefused={onRefused}
          />
        ) : (
          <ChangeBar
            staged={staged}
            onDiscard={() => stage([])}
            onReview={() => setReviewing(true)}
          />
        ))}

      {blocker.status === 'blocked' && (
        <LeaveGuard
          staged={staged}
          onLeave={blocker.proceed}
          onStay={blocker.reset}
        />
      )}

      <VersionsPanel
        shown={shownVersion}
        onShow={setShownVersion}
        onRestored={(restored) => {
          setMoved(restored)
          toast.success(restored.title, { description: restored.description })
        }}
      />
    </>
  )
}
