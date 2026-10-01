import { type AuditEntry, useAudit } from '@/api/admin-console'
import { DataTable, type DataTableFilter } from '@/components/data-table'
import { PageHead } from '@/components/shell'
import { RowsSkeleton } from '@/components/shell/skeleton/RowsSkeleton'
import { isoDay } from '@/lib/format/dates'
import { actor, auditColumns, auditDetail } from '@/screens/admin/audit/columns'

const FILTERS: DataTableFilter<AuditEntry>[] = [
  {
    id: 'when',
    label: 'When',
    value: (entry) => isoDay(entry.created_at),
    range: true,
  },
  { id: 'by', label: 'By', value: actor },
  { id: 'action', label: 'Action', value: (entry) => entry.action },
  { id: 'object', label: 'Object', value: (entry) => entry.object_type },
]

const byId = (entry: AuditEntry) => String(entry.id)

/** The audit log (#72): who changed what, newest first, read-only. */
export function Audit() {
  const { data: entries, isPending } = useAudit()

  return (
    <>
      <PageHead
        title="Audit log"
        subtitle="Every change to accounts, approvers, rates and costings, newest first"
      />
      <section className="overflow-hidden rounded-lg border bg-card">
        {isPending ? (
          <RowsSkeleton label="Loading entries" className="p-4" />
        ) : (
          <DataTable
            columns={auditColumns}
            rows={entries ?? []}
            getRowId={byId}
            emptyMessage="Nothing has been recorded yet."
            sortable
            searchable
            filters={FILTERS}
            detail={auditDetail}
            flush
          />
        )}
      </section>
    </>
  )
}
