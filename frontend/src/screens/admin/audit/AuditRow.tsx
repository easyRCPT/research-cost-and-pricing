import { useState } from 'react'
import { ChevronRightIcon } from 'lucide-react'
import type { AuditEntry } from '@/api/admin-console'
import { Td } from '@/components/shell'
import { Badge } from '@/components/ui/badge'
import { dateTime } from '@/lib/format/dates'
import { cn } from '@/lib/utils'

export function AuditRow({
  entry,
  expandable,
}: {
  entry: AuditEntry
  expandable: boolean
}) {
  const [open, setOpen] = useState(false)
  const detail = entry.detail as Record<string, unknown> | null
  // No expander over an empty detail: it would open onto nothing.
  const hasDetail = !!detail && Object.keys(detail).length > 0

  return (
    <>
      <tr>
        {expandable && (
          <Td>
            {hasDetail && (
              <button
                type="button"
                onClick={() => setOpen(!open)}
                aria-expanded={open}
                aria-label={open ? 'Hide detail' : 'Show detail'}
                className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-primary"
              >
                <ChevronRightIcon
                  className={cn(
                    'size-4 transition-transform',
                    open && 'rotate-90',
                  )}
                />
              </button>
            )}
          </Td>
        )}
        <Td className="tabular whitespace-nowrap text-muted-foreground">
          {dateTime(entry.created_at)}
        </Td>
        <Td>{entry.actor_email ?? 'System'}</Td>
        <Td>
          <Badge variant="secondary" className="font-mono text-[11.5px]">
            {entry.action}
          </Badge>
        </Td>
        <Td className="text-muted-foreground">
          {entry.object_type} #{entry.object_id}
        </Td>
      </tr>
      {open && (
        <tr>
          <Td colSpan={5}>
            <pre className="ml-8 max-h-64 overflow-auto rounded-md border bg-muted/40 px-3 py-2 text-[12px] leading-relaxed">
              {JSON.stringify(detail, null, 2)}
            </pre>
          </Td>
        </tr>
      )}
    </>
  )
}
