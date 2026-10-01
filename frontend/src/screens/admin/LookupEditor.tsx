import { useState } from 'react'
import { useBlocker } from '@tanstack/react-router'
import { toast } from 'sonner'
import { useApproverGaps } from '@/api/admin-console'
import { useLookups } from '@/api/lookups'
import type { ChangesApplied, RateTable } from '@/api/admin-lookups'
import { PageHead, Panel } from '@/components/shell'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ApiError } from '@/lib/api'
import { asPercent } from '@/lib/format/constants'
import { salaryRateYear } from '@/lib/salary-rate-year'
import { AddRateRow, ChangeBar, RateTable as RateTableView, RatesMovedNotice, Review, type Refused } from './RateEditor'
import { RATE_TABLES, isRateTable, tableSpec } from './rateTables'
import { ReferenceTableEditor } from './ReferenceEditor'
import { REFERENCE_TABLES, referenceSpec, type ReferenceTable } from './referenceTables'
import { countText, idOf, refusedChange, upsert, type Row, type Staged } from './stagedChanges'
import { VersionsPanel, type RatesMoved } from './VersionsPanel'

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
  const [tableId, setTableId] = useState<RateTable | ReferenceTable>(RATE_TABLES[0].id)
  const [staged, setStaged] = useState<Staged[]>([])
  const [refused, setRefused] = useState<Refused>(null)
  const [reviewing, setReviewing] = useState(false)
  const [moved, setMoved] = useState<RatesMoved | null>(null)
  const [shownVersion, setShownVersion] = useState<number | null>(null)

  const rowsOf = (id: RateTable | ReferenceTable) => (lookups[id] ?? []) as unknown as Row[]

  // A constant's value once the staged set is saved: what is staged for it,
  // or what it is now.
  const constantAfter = (name: string) => {
    const change = staged.find(
      (candidate) => candidate.table === 'calculation_constants' && candidate.key.name === name,
    )
    if (change?.op === 'update' && 'value' in change.value) return Number(change.value.value)
    return Number(lookups.calculation_constants.find((row) => row.name === name)?.value)
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

  const blocker = useBlocker({
    shouldBlockFn: () => true,
    disabled: staged.length === 0,
    enableBeforeUnload: () => staged.length > 0,
    withResolver: true,
  })

  const seeVersion = (versionId: number) => {
    setShownVersion(versionId)
    requestAnimationFrame(() =>
      document.getElementById(`version-${versionId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
    )
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
    if (which) setTableId(staged.find((change) => idOf(change) === which.id)!.table)
    toast.error('Nothing was saved', {
      description: error instanceof ApiError ? error.message : 'Try again.',
    })
  }

  return (
    <>
      <PageHead title="Lookup tables" subtitle="The rates every costing is priced with, and the lists it is built from" />

      {moved ? (
        <RatesMovedNotice moved={moved} onSee={seeVersion} onDismiss={() => setMoved(null)} />
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

      <Tabs value={tableId} onValueChange={(next) => setTableId(next as typeof tableId)}>
        <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="text-[12px] font-semibold tracking-wide text-muted-foreground uppercase">Rates</span>
          <TabsList aria-label="Rate tables" className="flex-wrap">
            {RATE_TABLES.map((table) => {
              const changes = staged.filter((change) => change.table === table.id).length
              return (
                <TabsTrigger key={table.id} value={table.id}>
                  {table.label}
                  {changes > 0 && (
                    <Badge className="ml-1.5" aria-label={`${changes} unsaved`}>
                      {changes}
                    </Badge>
                  )}
                </TabsTrigger>
              )
            })}
          </TabsList>
          <span className="text-[12px] font-semibold tracking-wide text-muted-foreground uppercase">
            Reference
          </span>
          <TabsList aria-label="Reference tables" className="flex-wrap">
            {REFERENCE_TABLES.map((table) => (
              <TabsTrigger key={table.id} value={table.id}>
                {table.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      </Tabs>

      {isRateTable(tableId) ? (
        <Panel
          title={tableSpec(tableId).label}
          description={
            tableId === 'salary_rates' && salaryRateYear(lookups) !== undefined
              ? `These are ${salaryRateYear(lookups)} rates: each later year adds that year's EBA increase. The year is the salary rate year, on the Constants tab.`
              : undefined
          }
        >
          <RateTableView
            spec={tableSpec(tableId)}
            rows={rowsOf(tableId)}
            staged={staged}
            refused={refused}
            onStage={stage}
          />
          {tableSpec(tableId).addable !== false && (
            <AddRateRow
              key={tableId}
              spec={tableSpec(tableId)}
              onAdd={(key, value) => stage(upsert(staged, { op: 'create', table: tableId, key, value }))}
            />
          )}
        </Panel>
      ) : (
        <ReferenceTableEditor
          spec={referenceSpec(tableId)}
          rows={rowsOf(tableId)}
          faculties={lookups.faculties}
          flags={
            gaps.data && tableId === 'departments'
              ? { keys: new Set(gaps.data.departments_without_head), label: 'No head of department' }
              : gaps.data && tableId === 'faculties'
                ? { keys: new Set(gaps.data.faculties_without_dean), label: 'No dean' }
                : undefined
          }
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
          <ChangeBar staged={staged} onDiscard={() => stage([])} onReview={() => setReviewing(true)} />
        ))}

      {blocker.status === 'blocked' && (
        <div
          role="alertdialog"
          aria-label="Unsaved changes"
          className="sticky bottom-4 z-10 mt-4 rounded-md border border-destructive/30 bg-card px-4 py-3 text-[13px] shadow-lg"
        >
          <p className="font-semibold text-destructive">Leave without saving?</p>
          <p className="mt-1">
            {countText(staged)} {staged.length === 1 ? 'has' : 'have'} not been saved, and will be lost.
          </p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" variant="destructive" onClick={blocker.proceed}>
              Leave without saving
            </Button>
            <Button size="sm" variant="ghost" onClick={blocker.reset}>
              Stay
            </Button>
          </div>
        </div>
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
