import {
  type AuditEntry,
  type AuditQuery,
  useAudit,
  useAuditFilters,
} from '@/api/admin-console'
import {
  DataTable,
  type DataTableFilter,
  useRemote,
} from '@/components/data-table'
import type { FilterState } from '@/components/data-table/filtering'
import { PageHead } from '@/components/shell'
import { RowsSkeleton } from '@/components/shell/skeleton/RowsSkeleton'
import { isoDay } from '@/lib/format/dates'
import { cn } from '@/lib/utils'
import { actor, auditColumns, auditDetail } from '@/screens/admin/audit/columns'

// Ids are the API's query parameters; the server applies every one.
const FILTERS: DataTableFilter<AuditEntry>[] = [
  {
    id: 'when',
    label: 'When',
    value: (entry) => isoDay(entry.created_at),
    range: true,
  },
  { id: 'actor', label: 'By', value: actor },
  { id: 'action', label: 'Action', value: (entry) => entry.action },
  { id: 'object_type', label: 'Object', value: (entry) => entry.object_type },
]

const byId = (entry: AuditEntry) => String(entry.id)

const NO_OPTIONS = {}

const toQuery = ({ when = [], ...lists }: FilterState): AuditQuery => ({
  ...lists,
  since: when[0] || undefined,
  until: when[1] || undefined,
})

/** The audit log (#72): who changed what, newest first, read-only. */
export function Audit() {
  const paged = useRemote()
  const entries = useAudit({
    ...toQuery(paged.filters),
    limit: paged.query.limit,
    cursor: paged.query.cursor,
  })
  const options = useAuditFilters(toQuery(paged.filters)).data ?? NO_OPTIONS

  return (
    <>
      <PageHead
        title="Audit log"
        subtitle="Every change to accounts, approvers, rates and costings, newest first"
      />
      <section
        className={cn(
          'overflow-hidden rounded-lg border bg-card',
          entries.isPlaceholderData && 'opacity-70',
        )}
      >
        {entries.data ? (
          <DataTable
            columns={auditColumns}
            rows={entries.data.results}
            getRowId={byId}
            emptyMessage="Nothing has been recorded yet."
            filters={FILTERS}
            detail={auditDetail}
            flush
            remote={paged.remote(entries.data, options)}
          />
        ) : (
          <RowsSkeleton label="Loading entries" className="p-4" />
        )}
      </section>
    </>
  )
}
