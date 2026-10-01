import { ChevronRightIcon } from 'lucide-react'

import type { AuditEntry } from '@/api/admin-console'
import { columnHelper, type DataTableColumns } from '@/components/data-table'
import { Badge } from '@/components/ui/badge'
import { dateTime } from '@/lib/format/dates'
import { cn } from '@/lib/utils'

const col = columnHelper<AuditEntry>()

export const actor = (entry: AuditEntry) => entry.actor_name ?? 'System'

/** No expander over an empty detail: it would open onto nothing. */
export function auditDetail(entry: AuditEntry) {
  const detail = entry.detail as Record<string, unknown> | null
  if (!detail || Object.keys(detail).length === 0) return null
  return (
    <pre className="ml-8 max-h-64 overflow-auto rounded-md border bg-muted/40 px-3 py-2 text-[12px] leading-relaxed">
      {JSON.stringify(detail, null, 2)}
    </pre>
  )
}

export const auditColumns: DataTableColumns<AuditEntry> = col.columns([
  col.display({
    id: 'expand',
    enableHiding: false,
    cell: ({ row }) =>
      row.getCanExpand() && (
        <button
          type="button"
          onClick={() => row.toggleExpanded()}
          aria-expanded={row.getIsExpanded()}
          aria-label={row.getIsExpanded() ? 'Hide detail' : 'Show detail'}
          className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-primary"
        >
          <ChevronRightIcon
            className={cn(
              'size-4 transition-transform',
              row.getIsExpanded() && 'rotate-90',
            )}
          />
        </button>
      ),
    meta: { className: 'w-8' },
  }),
  col.accessor('created_at', {
    header: 'When',
    cell: ({ getValue }) => dateTime(getValue()),
    meta: {
      className: 'w-[190px] tabular whitespace-nowrap text-muted-foreground',
    },
  }),
  col.accessor(actor, {
    id: 'by',
    header: 'By',
    meta: { className: 'w-[240px]' },
  }),
  col.accessor('action', {
    header: 'Action',
    cell: ({ getValue }) => (
      <Badge variant="secondary" className="font-mono text-[11.5px]">
        {getValue()}
      </Badge>
    ),
    meta: { className: 'w-[230px]' },
  }),
  col.accessor((entry) => `${entry.object_type} #${entry.object_id}`, {
    id: 'object',
    header: 'Object',
    meta: { className: 'text-muted-foreground' },
  }),
])
