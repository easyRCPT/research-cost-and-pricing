import { useBlocker, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'

import { useApproverGaps } from '@/api/admin-console'
import type { RateTable } from '@/api/admin-lookups'
import { useLookups } from '@/api/lookups'
import {
  LOOKUP_TABS,
  LookupTabsView,
  type LookupTabValue,
  type LookupTabView,
} from '@/components/lookups-tabs'
import { PageHead } from '@/components/shell'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  ADMIN_TABLES,
  type AdminTable,
  tabOf,
} from '@/screens/admin/lookups/adminTables'
import { gapFlags } from '@/screens/admin/lookups/gapFlags'
import { LeaveGuard } from '@/screens/admin/lookups/LeaveGuard'
import { RateDataTable } from '@/screens/admin/lookups/RateDataTable'
import { ReferenceDataTable } from '@/screens/admin/lookups/ReferenceDataTable'
import { useStagedChanges } from '@/screens/admin/lookups/useStagedChanges'
import { ChangeBar } from '@/screens/admin/rates/ChangeBar'
import { RatesMovedNotice } from '@/screens/admin/rates/RatesMovedNotice'
import { Review } from '@/screens/admin/rates/Review'
import { tableSpec } from '@/screens/admin/rateTables'
import { referenceSpec } from '@/screens/admin/referenceTables'
import type { Row } from '@/screens/admin/stagedChanges'

const FIRST_TABLES = Object.fromEntries(
  LOOKUP_TABS.map((tab) => [tab.value, ADMIN_TABLES[tab.value][0].id]),
)

/**
 * Everything an administrator maintains in the workbook's lookup sheets, on
 * the costing screen's own tabs (#138, #70, #144).
 *
 * The rates price a costing, so they are edited as one reviewed set: edits
 * are held on screen, across every rate tab, until they are reviewed and
 * saved in one request, which the server applies all at once or not at all.
 * The reference tables (faculties, departments, the lists a project picks
 * from) don't price anything, so each row is saved on its own.
 */
export function LookupEditor() {
  const { data: lookups } = useLookups()
  // Which units have nobody to sign for them, flagged on their rows (#121).
  const gaps = useApproverGaps()
  const navigate = useNavigate()
  const [tab, setTab] = useState<string>(LOOKUP_TABS[0].value)
  const [tables, setTables] = useState<Record<string, string>>(FIRST_TABLES)

  const showTable = (id: RateTable) => {
    const on = tabOf(id)
    setTab(on)
    setTables((current) => ({ ...current, [on]: id }))
  }

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
  } = useStagedChanges(lookups, showTable)

  const blocker = useBlocker({
    shouldBlockFn: () => true,
    disabled: staged.length === 0,
    enableBeforeUnload: () => staged.length > 0,
    withResolver: true,
  })

  const rowsOf = (id: string) =>
    (lookups[id as keyof typeof lookups] ?? []) as unknown as Row[]

  const resolve = (
    tabValue: LookupTabValue,
    table: AdminTable,
  ): LookupTabView['tables'][number] => {
    switch (table.kind) {
      case 'rate':
        return {
          value: table.id,
          title: tableSpec(table.id).label,
          count: staged.filter((change) => change.table === table.id).length,
          table: (
            <RateDataTable
              spec={tableSpec(table.id)}
              rows={rowsOf(table.id)}
              staged={staged}
              refused={refused}
              onStage={stage}
            />
          ),
        }
      case 'reference':
        return {
          value: table.id,
          title: referenceSpec(table.id).label,
          table: (
            <ReferenceDataTable
              spec={referenceSpec(table.id)}
              rows={rowsOf(table.id)}
              faculties={lookups.faculties}
              unassigned={gapFlags(table.id, gaps.data)}
            />
          ),
        }
      case 'view': {
        const view = LOOKUP_TABS.find((t) => t.value === tabValue)!.tables.find(
          (t) => t.value === table.id,
        )!
        return {
          value: view.value,
          title: view.title,
          table: view.render(lookups),
        }
      }
    }
  }

  const tabs: LookupTabView[] = LOOKUP_TABS.map((t) => ({
    value: t.value,
    title: t.title,
    notice: 'notice' in t ? t.notice(lookups) : undefined,
    tables: ADMIN_TABLES[t.value].map((table) => resolve(t.value, table)),
  }))

  return (
    <>
      <PageHead
        title="Lookup tables"
        subtitle="The rates every costing is priced with, and the lists it is built from"
      />

      {moved ? (
        <RatesMovedNotice
          moved={moved}
          onSee={(version) =>
            navigate({ to: '/admin/versions', search: { version } })
          }
          onDismiss={() => setMoved(null)}
        />
      ) : (
        <Alert className="mb-4">
          <AlertDescription>
            Rate changes are held until you review and save them as one set,
            which reprices every draft. Submitted costings keep their rates.
            Faculties, departments and the lists a project picks from save a
            row at a time.
          </AlertDescription>
        </Alert>
      )}

      {/* Room under the last row for the floating change bar. */}
      <div className={staged.length > 0 ? 'pb-20' : undefined}>
        <LookupTabsView
          tabs={tabs}
          value={tab}
          onValueChange={setTab}
          tables={tables}
          onTableChange={(on, table) =>
            setTables((current) => ({ ...current, [on]: table }))
          }
        />
      </div>

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
    </>
  )
}
