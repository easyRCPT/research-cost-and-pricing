import { useMemo, useState } from 'react'

import { type LookupVersion, useLookupVersions } from '@/api/admin-lookups'
import { DataTable, type DataTableFilter } from '@/components/data-table'
import { isoDay } from '@/lib/format/dates'

import { versionColumns } from './columns'
import { RestoreDialog } from './RestoreDialog'
import type { RatesMoved, Shown } from './types'
import { VersionDialog } from './VersionDialog'

interface VersionsPanelProps {
  /** The version whose dialog is open, if any. */
  shown: Shown | null
  onShow: (shown: Shown | null) => void
  onRestored: (moved: RatesMoved) => void
}

const FILTERS: DataTableFilter<LookupVersion>[] = [
  {
    id: 'made',
    label: 'Made',
    value: (version) => isoDay(version.created_at),
    range: true,
  },
  {
    id: 'by',
    label: 'By',
    value: (version) => version.updated_by_name ?? 'System',
  },
]

const byId = (version: LookupVersion) => String(version.id)

/**
 * Every set of rates the tool has had, the changes saved into each, and a way
 * to put one back (#137, #138).
 *
 * Restoring copies the old set into a new version and makes that current, so
 * nothing already priced moves and the restore itself is part of the history.
 */
export function VersionsPanel({
  shown,
  onShow,
  onRestored,
}: VersionsPanelProps) {
  const { data: versions } = useLookupVersions()
  const [restoring, setRestoring] = useState<LookupVersion | null>(null)

  const opened = versions.find((version) => version.id === shown?.id)

  const columns = useMemo(
    () =>
      versionColumns({
        open: (id, tab) => onShow({ id, tab }),
        restore: setRestoring,
      }),
    [onShow],
  )

  return (
    <section className="overflow-hidden rounded-lg border bg-card">
      <DataTable
        columns={columns}
        rows={versions}
        getRowId={byId}
        emptyMessage="No versions yet."
        sortable
        filters={FILTERS}
        flush
      />
      {opened && shown && (
        <VersionDialog
          version={opened}
          tab={shown.tab}
          onTab={(tab) => onShow({ id: opened.id, tab })}
          onClose={() => onShow(null)}
        />
      )}
      {restoring && (
        <RestoreDialog
          version={restoring}
          onClose={() => setRestoring(null)}
          onRestored={onRestored}
        />
      )}
    </section>
  )
}
