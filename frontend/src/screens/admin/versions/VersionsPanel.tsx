import { useMemo, useState } from 'react'

import {
  type LookupVersion,
  useLookupVersion,
  useLookupVersions,
  useVersionFilters,
} from '@/api/admin-lookups'
import {
  DataTable,
  type DataTableFilter,
  useRemote,
} from '@/components/data-table'
import type { FilterState } from '@/components/data-table/filtering'
import { RowsSkeleton } from '@/components/shell/skeleton/RowsSkeleton'
import { isoDay } from '@/lib/format/dates'
import { cn } from '@/lib/utils'

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

/** The By filter's value for a version made by nobody, as the API takes it. */
const SYSTEM = 'system'

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
    value: (version) => version.updated_by ?? SYSTEM,
  },
]

const byId = (version: LookupVersion) => String(version.id)

const toQuery = ({ made = [], by }: FilterState) => ({
  by,
  since: made[0] || undefined,
  until: made[1] || undefined,
})

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
  const paged = useRemote()
  const versions = useLookupVersions({
    ...toQuery(paged.filters),
    ...paged.query,
  })
  const values = useVersionFilters({
    ...toQuery(paged.filters),
    q: paged.query.q,
  }).data
  const [restoring, setRestoring] = useState<LookupVersion | null>(null)

  const onPage = versions.data?.results.find(
    (version) => version.id === shown?.id,
  )
  // A link can name a version on some other page.
  const fetched = useLookupVersion(shown && !onPage ? shown.id : null).data
  const opened = onPage ?? fetched

  const options = useMemo(
    () => ({
      by: (values?.by ?? []).map((option) =>
        option.value === SYSTEM ? { ...option, label: 'System' } : option,
      ),
    }),
    [values],
  )

  const columns = useMemo(
    () =>
      versionColumns({
        open: (id, tab) => onShow({ id, tab }),
        restore: setRestoring,
      }),
    [onShow],
  )

  return (
    <section
      className={cn(
        'overflow-hidden rounded-lg border bg-card',
        versions.isPlaceholderData && 'opacity-70',
      )}
    >
      {versions.data ? (
        <DataTable
          columns={columns}
          rows={versions.data.results}
          getRowId={byId}
          emptyMessage="No versions yet."
          sortable
          searchable
          filters={FILTERS}
          flush
          remote={paged.remote(versions.data, options)}
        />
      ) : (
        <RowsSkeleton label="Loading versions" className="p-4" />
      )}
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
